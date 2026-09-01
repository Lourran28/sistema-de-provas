package br.com.provas.services;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

import jakarta.persistence.criteria.Predicate;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.provas.dtos.questions.QuestionPageResponse;
import br.com.provas.dtos.questions.QuestionClearResponse;
import br.com.provas.dtos.questions.QuestionRequest;
import br.com.provas.dtos.questions.QuestionResponse;
import br.com.provas.entities.AlternativeEntity;
import br.com.provas.entities.ContentEntity;
import br.com.provas.entities.QuestionContentEntity;
import br.com.provas.entities.QuestionContentOriginType;
import br.com.provas.entities.QuestionDifficulty;
import br.com.provas.entities.QuestionEntity;
import br.com.provas.entities.QuestionSourceType;
import br.com.provas.entities.QuestionStatus;
import br.com.provas.entities.QuestionType;
import br.com.provas.entities.SubjectEntity;
import br.com.provas.exceptions.NotFoundException;
import br.com.provas.repositories.AlternativeRepository;
import br.com.provas.repositories.ExamQuestionRepository;
import br.com.provas.repositories.QuestionContentRepository;
import br.com.provas.repositories.QuestionRepository;
import br.com.provas.services.generation.GeneratedQuestionDraft;

@Service
public class QuestionService {

    private static final Pattern IMAGE_DATA_URL = Pattern.compile("^data:image/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$");

    private final QuestionRepository questionRepository;
    private final AlternativeRepository alternativeRepository;
    private final QuestionContentRepository questionContentRepository;
    private final ExamQuestionRepository examQuestionRepository;
    private final SubjectService subjectService;
    private final ContentService contentService;

    public QuestionService(
            QuestionRepository questionRepository,
            AlternativeRepository alternativeRepository,
            QuestionContentRepository questionContentRepository,
            ExamQuestionRepository examQuestionRepository,
            SubjectService subjectService,
            ContentService contentService) {
        this.questionRepository = questionRepository;
        this.alternativeRepository = alternativeRepository;
        this.questionContentRepository = questionContentRepository;
        this.examQuestionRepository = examQuestionRepository;
        this.subjectService = subjectService;
        this.contentService = contentService;
    }

    @Transactional(readOnly = true)
    public QuestionPageResponse list(UUID teacherId, String search, UUID subjectId, QuestionDifficulty difficulty, Pageable pageable) {
        String normalizedSearch = normalizeOptional(search);
        Specification<QuestionEntity> filters = (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.equal(root.get("teacherId"), teacherId));
            predicates.add(builder.equal(root.get("status"), QuestionStatus.ACTIVE));
            if (normalizedSearch != null) {
                String pattern = "%" + normalizedSearch.toLowerCase(Locale.ROOT) + "%";
                predicates.add(builder.like(builder.lower(root.get("statement")), pattern));
            }
            if (subjectId != null) {
                predicates.add(builder.equal(root.get("subjectId"), subjectId));
            }
            if (difficulty != null) {
                predicates.add(builder.equal(root.get("difficulty"), difficulty));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };
        Page<QuestionEntity> page = questionRepository.findAll(filters, pageable);
        List<QuestionEntity> questions = page.getContent();
        Map<UUID, List<UUID>> contentIdsByQuestion = findContentIdsByQuestion(questions);
        Map<UUID, List<AlternativeEntity>> alternativesByQuestion = findAlternativesByQuestion(questions);

        return new QuestionPageResponse(
                questions.stream()
                        .map(question -> QuestionResponse.from(
                                question,
                                contentIdsByQuestion.getOrDefault(question.getId(), List.of()),
                                alternativesByQuestion.getOrDefault(question.getId(), List.of())))
                        .toList(),
                new QuestionPageResponse.PageInfo(
                        page.getNumber(),
                        page.getSize(),
                        page.getTotalElements(),
                        page.getTotalPages()));
    }

    @Transactional(readOnly = true)
    public QuestionResponse get(UUID teacherId, UUID questionId) {
        QuestionEntity question = findEntity(teacherId, questionId);
        return QuestionResponse.from(
                question,
                findContentIdsByQuestion(List.of(question)).getOrDefault(questionId, List.of()),
                alternativeRepository.findAllByQuestionIdOrderByPositionAsc(questionId));
    }

    @Transactional
    public QuestionResponse create(UUID teacherId, QuestionRequest request) {
        ResolvedQuestionData data = resolveRequest(teacherId, request);
        QuestionEntity question = questionRepository.save(new QuestionEntity(
                teacherId,
                data.subjectId(),
                normalizeStatement(request.statement()),
                request.questionType(),
                request.difficulty(),
                QuestionSourceType.MANUAL,
                normalizeImageUrl(request.imageUrl())));
        replaceDetails(question.getId(), data.contentId(), request);
        return get(teacherId, question.getId());
    }

    @Transactional
    public QuestionResponse update(UUID teacherId, UUID questionId, QuestionRequest request) {
        QuestionEntity question = findEntity(teacherId, questionId);
        ResolvedQuestionData data = resolveRequest(teacherId, request);
        question.update(
                data.subjectId(),
                normalizeStatement(request.statement()),
                request.questionType(),
                request.difficulty(),
                normalizeImageUrl(request.imageUrl()));
        questionRepository.save(question);
        replaceDetails(questionId, data.contentId(), request);
        return get(teacherId, questionId);
    }

    @Transactional
    public void delete(UUID teacherId, UUID questionId) {
        QuestionEntity question = findEntity(teacherId, questionId);
        deleteOrArchive(question);
    }

    @Transactional
    public QuestionClearResponse clear(UUID teacherId) {
        int deletedCount = 0;
        int archivedCount = 0;
        for (QuestionEntity question : questionRepository.findAllByTeacherIdAndStatus(teacherId, QuestionStatus.ACTIVE)) {
            if (deleteOrArchive(question)) {
                deletedCount += 1;
            } else {
                archivedCount += 1;
            }
        }
        return new QuestionClearResponse(archivedCount, deletedCount);
    }

    @Transactional(readOnly = true)
    public List<QuestionEntity> findEntities(UUID teacherId, List<UUID> questionIds) {
        if (questionIds.isEmpty()) {
            throw new IllegalArgumentException("Selecione pelo menos uma questão.");
        }
        if (questionIds.stream().distinct().count() != questionIds.size()) {
            throw new IllegalArgumentException("Uma questão não pode ser adicionada mais de uma vez à prova.");
        }

        Map<UUID, QuestionEntity> questionsById = new HashMap<>();
        for (QuestionEntity question : questionRepository.findAllByIdInAndTeacherId(questionIds, teacherId)) {
            if (question.getStatus() != QuestionStatus.ACTIVE) {
                throw new IllegalArgumentException("Uma questão arquivada não pode ser adicionada a uma nova prova.");
            }
            questionsById.put(question.getId(), question);
        }
        if (questionsById.size() != questionIds.size()) {
            throw new NotFoundException("Uma ou mais questões não foram encontradas.");
        }

        return questionIds.stream().map(questionsById::get).toList();
    }

    @Transactional
    public QuestionEntity createGenerated(
            UUID teacherId,
            UUID examSubjectId,
            ContentEntity sourceContent,
            QuestionDifficulty difficulty,
            GeneratedQuestionDraft draft) {
        if (!sourceContent.getId().equals(draft.contentId())) {
            throw new IllegalArgumentException("A questão gerada deve permanecer vinculada ao conteúdo selecionado.");
        }
        if (draft.alternatives().size() < 2 || draft.correctAlternativeIndex() < 0 || draft.correctAlternativeIndex() >= draft.alternatives().size()) {
            throw new IllegalArgumentException("A geração retornou alternativas inválidas.");
        }

        UUID subjectId = sourceContent.getSubjectId() != null ? sourceContent.getSubjectId() : examSubjectId;
        QuestionEntity question = questionRepository.save(new QuestionEntity(
                teacherId,
                subjectId,
                normalizeStatement(draft.statement()),
                QuestionType.MULTIPLE_CHOICE,
                difficulty,
                QuestionSourceType.AI));

        List<AlternativeEntity> alternatives = new ArrayList<>();
        for (int index = 0; index < draft.alternatives().size(); index++) {
            alternatives.add(new AlternativeEntity(
                    question.getId(),
                    normalizeRequired(draft.alternatives().get(index)),
                    index + 1,
                    index == draft.correctAlternativeIndex()));
        }
        alternativeRepository.saveAll(alternatives);
        questionContentRepository.save(new QuestionContentEntity(
                question.getId(),
                sourceContent.getId(),
                QuestionContentOriginType.PRIMARY));
        return question;
    }

    @Transactional(readOnly = true)
    public ContentEntity findPrimaryContent(UUID teacherId, UUID questionId) {
        findEntity(teacherId, questionId);
        return questionContentRepository.findAllByIdQuestionIdIn(List.of(questionId)).stream()
                .filter(link -> link.getOriginType() == QuestionContentOriginType.PRIMARY)
                .findFirst()
                .map(link -> contentService.findEntity(teacherId, link.getId().getContentId()))
                .orElseThrow(() -> new NotFoundException("Conteúdo de origem da questão não encontrado."));
    }

    public QuestionEntity findEntity(UUID teacherId, UUID questionId) {
        return questionRepository.findByIdAndTeacherId(questionId, teacherId)
                .orElseThrow(() -> new NotFoundException("Questão não encontrada."));
    }

    private ResolvedQuestionData resolveRequest(UUID teacherId, QuestionRequest request) {
        if (request.correctAlternativeIndex() >= request.alternatives().size()) {
            throw new IllegalArgumentException("Selecione uma alternativa correta válida.");
        }

        UUID subjectId = null;
        if (request.subjectId() != null) {
            SubjectEntity subject = subjectService.findEntity(teacherId, request.subjectId());
            subjectId = subject.getId();
        }

        UUID contentId = null;
        if (request.contentId() != null) {
            ContentEntity content = contentService.findEntity(teacherId, request.contentId());
            contentId = content.getId();
            if (content.getSubjectId() != null) {
                if (subjectId != null && !subjectId.equals(content.getSubjectId())) {
                    throw new IllegalArgumentException("A disciplina da questão deve ser a mesma do conteúdo de origem.");
                }
                subjectId = content.getSubjectId();
            }
        }
        return new ResolvedQuestionData(subjectId, contentId);
    }

    private void replaceDetails(UUID questionId, UUID contentId, QuestionRequest request) {
        alternativeRepository.deleteByQuestionId(questionId);
        questionContentRepository.deleteByIdQuestionId(questionId);

        List<AlternativeEntity> alternatives = new ArrayList<>();
        for (int index = 0; index < request.alternatives().size(); index++) {
            alternatives.add(new AlternativeEntity(
                    questionId,
                    normalizeRequired(request.alternatives().get(index).text()),
                    index + 1,
                    index == request.correctAlternativeIndex()));
        }
        alternativeRepository.saveAll(alternatives);

        if (contentId != null) {
            questionContentRepository.save(new QuestionContentEntity(questionId, contentId, QuestionContentOriginType.PRIMARY));
        }
    }

    private Map<UUID, List<UUID>> findContentIdsByQuestion(List<QuestionEntity> questions) {
        if (questions.isEmpty()) {
            return Map.of();
        }
        Map<UUID, List<UUID>> result = new HashMap<>();
        List<UUID> questionIds = questions.stream().map(QuestionEntity::getId).toList();
        for (QuestionContentEntity link : questionContentRepository.findAllByIdQuestionIdIn(questionIds)) {
            result.computeIfAbsent(link.getId().getQuestionId(), ignored -> new ArrayList<>())
                    .add(link.getId().getContentId());
        }
        return result;
    }

    private Map<UUID, List<AlternativeEntity>> findAlternativesByQuestion(List<QuestionEntity> questions) {
        if (questions.isEmpty()) {
            return Map.of();
        }
        Map<UUID, List<AlternativeEntity>> result = new HashMap<>();
        List<UUID> questionIds = questions.stream().map(QuestionEntity::getId).toList();
        for (AlternativeEntity alternative : alternativeRepository.findAllByQuestionIdInOrderByQuestionIdAscPositionAsc(questionIds)) {
            result.computeIfAbsent(alternative.getQuestionId(), ignored -> new ArrayList<>()).add(alternative);
        }
        return result;
    }

    private String normalizeStatement(String value) {
        return value.trim();
    }

    private String normalizeRequired(String value) {
        return value.trim();
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeImageUrl(String value) {
        String imageUrl = normalizeOptional(value);
        if (imageUrl == null) {
            return null;
        }
        if (IMAGE_DATA_URL.matcher(imageUrl).matches()) {
            return imageUrl;
        }
        try {
            URI uri = new URI(imageUrl);
            String scheme = uri.getScheme();
            if (("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) && uri.getHost() != null) {
                return uri.toString();
            }
        } catch (URISyntaxException ignored) {
            // The validation message below is clearer for the person filling in the form.
        }
        throw new IllegalArgumentException("A imagem da questão deve ser um arquivo PNG, JPEG ou WebP, ou usar uma URL HTTP ou HTTPS válida.");
    }

    private boolean deleteOrArchive(QuestionEntity question) {
        UUID questionId = question.getId();
        if (examQuestionRepository.existsByQuestionId(questionId)) {
            question.archive();
            questionRepository.save(question);
            return false;
        }
        alternativeRepository.deleteByQuestionId(questionId);
        questionContentRepository.deleteByIdQuestionId(questionId);
        questionRepository.delete(question);
        return true;
    }

    private record ResolvedQuestionData(UUID subjectId, UUID contentId) {
    }
}
