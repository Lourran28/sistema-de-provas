package br.com.provas.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.provas.dtos.exams.ExamContentResponse;
import br.com.provas.dtos.exams.ExamClearResponse;
import br.com.provas.dtos.exams.ExamPageResponse;
import br.com.provas.dtos.exams.ExamQuestionResponse;
import br.com.provas.dtos.exams.ExamRequest;
import br.com.provas.dtos.exams.ExamResponse;
import br.com.provas.dtos.exams.GenerateExamRequest;
import br.com.provas.dtos.exams.GeneratedExamContentRequest;
import br.com.provas.entities.ContentEntity;
import br.com.provas.entities.ExamContentEntity;
import br.com.provas.entities.ExamEntity;
import br.com.provas.entities.ExamKind;
import br.com.provas.entities.ExamQuestionEntity;
import br.com.provas.entities.ExamStatus;
import br.com.provas.entities.QuestionDistributionMode;
import br.com.provas.entities.QuestionEntity;
import br.com.provas.exceptions.NotFoundException;
import br.com.provas.repositories.ExamContentRepository;
import br.com.provas.repositories.ExamQuestionRepository;
import br.com.provas.repositories.ExamRepository;
import br.com.provas.repositories.ExamVersionRepository;
import br.com.provas.services.generation.ContentSource;
import br.com.provas.services.generation.GeneratedQuestionDraft;
import br.com.provas.services.generation.QuestionGenerationCommand;
import br.com.provas.services.generation.QuestionGenerationProvider;

@Service
public class ExamService {

    private final ExamRepository examRepository;
    private final ExamQuestionRepository examQuestionRepository;
    private final ExamContentRepository examContentRepository;
    private final ExamVersionRepository examVersionRepository;
    private final SubjectService subjectService;
    private final ContentService contentService;
    private final QuestionService questionService;
    private final QuestionGenerationProvider questionGenerationProvider;
    private final CorrectionService correctionService;

    public ExamService(
            ExamRepository examRepository,
            ExamQuestionRepository examQuestionRepository,
            ExamContentRepository examContentRepository,
            ExamVersionRepository examVersionRepository,
            SubjectService subjectService,
            ContentService contentService,
            QuestionService questionService,
            QuestionGenerationProvider questionGenerationProvider,
            CorrectionService correctionService) {
        this.examRepository = examRepository;
        this.examQuestionRepository = examQuestionRepository;
        this.examContentRepository = examContentRepository;
        this.examVersionRepository = examVersionRepository;
        this.subjectService = subjectService;
        this.contentService = contentService;
        this.questionService = questionService;
        this.questionGenerationProvider = questionGenerationProvider;
        this.correctionService = correctionService;
    }

    @Transactional(readOnly = true)
    public ExamPageResponse list(UUID teacherId, Pageable pageable) {
        Page<ExamEntity> page = examRepository.findAllByTeacherIdAndArchivedFalse(teacherId, pageable);
        return new ExamPageResponse(
                page.getContent().stream().map(this::toResponse).toList(),
                new ExamPageResponse.PageInfo(page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages()));
    }

    @Transactional(readOnly = true)
    public ExamResponse get(UUID teacherId, UUID examId) {
        return toResponse(findEntity(teacherId, examId));
    }

    @Transactional
    public void delete(UUID teacherId, UUID examId) {
        deleteOrArchive(findEntity(teacherId, examId));
    }

    @Transactional
    public ExamClearResponse clear(UUID teacherId) {
        int deletedCount = 0;
        int archivedCount = 0;
        for (ExamEntity exam : examRepository.findAllByTeacherIdAndArchivedFalse(teacherId)) {
            if (deleteOrArchive(exam)) {
                deletedCount += 1;
            } else {
                archivedCount += 1;
            }
        }
        return new ExamClearResponse(archivedCount, deletedCount);
    }

    @Transactional
    public ExamResponse create(UUID teacherId, ExamRequest request) {
        if (request.questionIds().stream().distinct().count() != request.questionIds().size()) {
            throw new IllegalArgumentException("Uma questão não pode ser adicionada mais de uma vez à prova.");
        }

        ExamKind kind = resolveExamKind(request.kind(), ExamKind.PROVA);
        validateQuestionCountForKind(kind, request.questionIds().size());
        UUID subjectId = resolveSubjectId(teacherId, request.subjectId());
        List<QuestionEntity> questions = questionService.findEntities(teacherId, request.questionIds());
        validateQuestionsForSubject(questions, subjectId);

        ExamEntity exam = createDraftExam(
                teacherId,
                subjectId,
                request.title(),
                request.classGroup(),
                request.topic(),
                request.description(),
                request.instructions(),
                request.examDate(),
                request.totalScore(),
                questions.size(),
                kind);
        persistExamQuestions(exam, questions);
        return toResponse(exam);
    }

    @Transactional
    public ExamResponse updateDraft(UUID teacherId, UUID examId, ExamRequest request) {
        ExamEntity exam = findEntity(teacherId, examId);
        ensureDraft(exam);

        ExamKind kind = resolveExamKind(request.kind(), exam.getKind());
        validateQuestionCountForKind(kind, request.questionIds().size());
        UUID subjectId = resolveSubjectId(teacherId, request.subjectId());
        List<QuestionEntity> questions = questionService.findEntities(teacherId, request.questionIds());
        validateQuestionsForSubject(questions, subjectId);

        exam.updateDraft(
                subjectId,
                normalizeRequired(request.title()),
                normalizeOptional(request.classGroup()),
                normalizeOptional(request.topic()),
                normalizeOptional(request.description()),
                normalizeOptional(request.instructions()),
                request.examDate(),
                request.totalScore().setScale(2, RoundingMode.HALF_UP),
                questions.size(),
                kind);
        examRepository.save(exam);
        examQuestionRepository.deleteByExamId(examId);
        persistExamQuestions(exam, questions);
        return toResponse(exam);
    }

    @Transactional
    public ExamResponse generate(UUID teacherId, GenerateExamRequest request) {
        List<GeneratedExamContentRequest> requestedContents = request.contents();
        if (requestedContents.stream().map(GeneratedExamContentRequest::contentId).distinct().count() != requestedContents.size()) {
            throw new IllegalArgumentException("Um conteúdo não pode ser selecionado mais de uma vez.");
        }
        if (request.totalQuestions() < requestedContents.size()) {
            throw new IllegalArgumentException("A quantidade de questões deve ser igual ou maior que a quantidade de conteúdos selecionados.");
        }
        ExamKind kind = resolveExamKind(request.kind(), ExamKind.PROVA);
        validateQuestionCountForKind(kind, request.totalQuestions());

        UUID subjectId = resolveSubjectId(teacherId, request.subjectId());
        List<ContentEntity> contents = requestedContents.stream()
                .map(item -> contentService.findEntity(teacherId, item.contentId()))
                .toList();
        validateContentsForSubject(contents, subjectId);
        Map<UUID, Integer> questionCountByContent = resolveDistribution(request, requestedContents);

        ExamEntity exam = createDraftExam(
                teacherId,
                subjectId,
                request.title(),
                request.classGroup(),
                request.topic(),
                request.description(),
                request.instructions(),
                request.examDate(),
                request.totalScore(),
                request.totalQuestions(),
                kind);

        List<ExamContentEntity> examContents = contents.stream()
                .map(content -> new ExamContentEntity(exam.getId(), content.getId(), questionCountByContent.get(content.getId())))
                .toList();
        examContentRepository.saveAll(examContents);

        List<ContentSource> sources = contents.stream()
                .map(content -> new ContentSource(content.getId(), content.getSubjectId(), content.getTitle(), content.getBody()))
                .toList();
        List<GeneratedQuestionDraft> drafts = questionGenerationProvider.generate(
                new QuestionGenerationCommand(sources, questionCountByContent, request.difficulty()));
        if (drafts.size() != request.totalQuestions()) {
            throw new IllegalStateException("A geração retornou uma quantidade de questões diferente da solicitada.");
        }

        Map<UUID, ContentEntity> contentById = new LinkedHashMap<>();
        for (ContentEntity content : contents) {
            contentById.put(content.getId(), content);
        }
        List<QuestionEntity> questions = new ArrayList<>();
        for (GeneratedQuestionDraft draft : drafts) {
            ContentEntity sourceContent = contentById.get(draft.contentId());
            if (sourceContent == null) {
                throw new IllegalStateException("A geração tentou utilizar um conteúdo não selecionado.");
            }
            questions.add(questionService.createGenerated(
                    teacherId,
                    subjectId,
                    sourceContent,
                    request.difficulty(),
                    draft));
        }

        persistExamQuestions(exam, questions);
        return toResponse(exam);
    }

    @Transactional
    public ExamResponse regenerateQuestion(UUID teacherId, UUID examId, UUID questionId) {
        ExamEntity exam = findEntity(teacherId, examId);
        ensureDraft(exam);
        ExamQuestionEntity examQuestion = examQuestionRepository.findByExamIdAndQuestionId(examId, questionId)
                .orElseThrow(() -> new NotFoundException("Questão não encontrada nesta prova."));
        QuestionEntity currentQuestion = questionService.findEntity(teacherId, questionId);
        ContentEntity sourceContent = questionService.findPrimaryContent(teacherId, questionId);

        List<GeneratedQuestionDraft> drafts = questionGenerationProvider.generate(new QuestionGenerationCommand(
                List.of(new ContentSource(
                        sourceContent.getId(),
                        sourceContent.getSubjectId(),
                        sourceContent.getTitle(),
                        sourceContent.getBody())),
                Map.of(sourceContent.getId(), 1),
                currentQuestion.getDifficulty(),
                examQuestion.getPosition() - 1));
        if (drafts.size() != 1 || !sourceContent.getId().equals(drafts.getFirst().contentId())) {
            throw new IllegalStateException("Não foi possível regenerar a questão com o conteúdo de origem correto.");
        }

        QuestionEntity replacement = questionService.createGenerated(
                teacherId,
                exam.getSubjectId(),
                sourceContent,
                currentQuestion.getDifficulty(),
                drafts.getFirst());
        examQuestion.replaceQuestion(replacement.getId());
        examQuestionRepository.save(examQuestion);
        return toResponse(exam);
    }

    @Transactional
    public ExamResponse approve(UUID teacherId, UUID examId) {
        ExamEntity exam = findEntity(teacherId, examId);
        ensureDraft(exam);
        if (examQuestionRepository.findAllByExamIdOrderByPositionAsc(examId).isEmpty()) {
            throw new IllegalArgumentException("A prova precisa possuir questões antes de ser aprovada.");
        }
        exam.approve();
        examRepository.save(exam);
        return toResponse(exam);
    }

    @Transactional
    public ExamResponse toggleQuestionCancellation(UUID teacherId, UUID examId, UUID questionId) {
        ExamEntity exam = findEntity(teacherId, examId);
        if (exam.getStatus() != ExamStatus.VERSIONS_GENERATED && exam.getStatus() != ExamStatus.APPLIED) {
            throw new IllegalStateException("Uma questão só pode ser anulada depois que as versões oficiais forem geradas.");
        }
        if (correctionService.hasConfirmedCorrectionsForExam(teacherId, examId)) {
            throw new IllegalStateException("Não é possível anular uma questão depois de confirmar correções desta prova.");
        }
        ExamQuestionEntity examQuestion = examQuestionRepository.findByExamIdAndQuestionId(examId, questionId)
                .orElseThrow(() -> new NotFoundException("Questão não encontrada nesta prova."));
        examQuestion.toggleCancelled();
        examQuestionRepository.save(examQuestion);
        correctionService.recalculateForExam(teacherId, examId);
        return toResponse(exam);
    }

    private ExamEntity createDraftExam(
            UUID teacherId,
            UUID subjectId,
            String title,
            String classGroup,
            String topic,
            String description,
            String instructions,
            LocalDate examDate,
            BigDecimal totalScore,
            int questionCount,
            ExamKind kind) {
        return examRepository.save(new ExamEntity(
                teacherId,
                subjectId,
                normalizeRequired(title),
                normalizeOptional(classGroup),
                normalizeOptional(topic),
                normalizeOptional(description),
                normalizeOptional(instructions),
                examDate,
                totalScore.setScale(2, RoundingMode.HALF_UP),
                questionCount,
                kind));
    }

    private void persistExamQuestions(ExamEntity exam, List<QuestionEntity> questions) {
        List<BigDecimal> pointValues = distributeScores(exam.getTotalScore(), questions.size());
        List<ExamQuestionEntity> examQuestions = new ArrayList<>();
        for (int index = 0; index < questions.size(); index++) {
            examQuestions.add(new ExamQuestionEntity(exam.getId(), questions.get(index).getId(), index + 1, pointValues.get(index)));
        }
        examQuestionRepository.saveAll(examQuestions);
    }

    private UUID resolveSubjectId(UUID teacherId, UUID subjectId) {
        return subjectId == null ? null : subjectService.findEntity(teacherId, subjectId).getId();
    }

    private ExamEntity findEntity(UUID teacherId, UUID examId) {
        return examRepository.findByIdAndTeacherId(examId, teacherId)
                .orElseThrow(() -> new NotFoundException("Prova não encontrada."));
    }

    private void ensureDraft(ExamEntity exam) {
        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new IllegalStateException("Somente provas em rascunho podem ser alteradas.");
        }
    }

    private boolean deleteOrArchive(ExamEntity exam) {
        UUID examId = exam.getId();
        if (examVersionRepository.existsByExamId(examId)) {
            exam.archive();
            examRepository.save(exam);
            return false;
        }
        examQuestionRepository.deleteByExamId(examId);
        examContentRepository.deleteByIdExamId(examId);
        examRepository.delete(exam);
        return true;
    }

    private ExamResponse toResponse(ExamEntity exam) {
        List<ExamContentResponse> contents = examContentRepository.findAllByIdExamIdOrderByIdContentIdAsc(exam.getId()).stream()
                .map(ExamContentResponse::from)
                .toList();
        List<ExamQuestionResponse> questions = examQuestionRepository.findAllByExamIdOrderByPositionAsc(exam.getId()).stream()
                .map(ExamQuestionResponse::from)
                .toList();
        return ExamResponse.from(exam, contents, questions);
    }

    private Map<UUID, Integer> resolveDistribution(
            GenerateExamRequest request,
            List<GeneratedExamContentRequest> requestedContents) {
        Map<UUID, Integer> distribution = new LinkedHashMap<>();
        if (request.distributionMode() == QuestionDistributionMode.AUTO) {
            int baseCount = request.totalQuestions() / requestedContents.size();
            int remainder = request.totalQuestions() % requestedContents.size();
            for (int index = 0; index < requestedContents.size(); index++) {
                distribution.put(requestedContents.get(index).contentId(), baseCount + (index < remainder ? 1 : 0));
            }
            return distribution;
        }

        int total = 0;
        for (GeneratedExamContentRequest content : requestedContents) {
            if (content.questionCount() == null) {
                throw new IllegalArgumentException("Informe a quantidade de questões para cada conteúdo.");
            }
            distribution.put(content.contentId(), content.questionCount());
            total += content.questionCount();
        }
        if (total != request.totalQuestions()) {
            throw new IllegalArgumentException("A soma das questões por conteúdo deve ser igual ao total de questões.");
        }
        return distribution;
    }

    private void validateQuestionsForSubject(List<QuestionEntity> questions, UUID subjectId) {
        if (subjectId == null) {
            return;
        }
        boolean hasAnotherSubject = questions.stream()
                .anyMatch(question -> question.getSubjectId() != null && !subjectId.equals(question.getSubjectId()));
        if (hasAnotherSubject) {
            throw new IllegalArgumentException("Todas as questões com disciplina devem pertencer à disciplina da prova.");
        }
    }

    private void validateContentsForSubject(List<ContentEntity> contents, UUID subjectId) {
        if (subjectId == null) {
            return;
        }
        boolean hasAnotherSubject = contents.stream()
                .anyMatch(content -> content.getSubjectId() != null && !subjectId.equals(content.getSubjectId()));
        if (hasAnotherSubject) {
            throw new IllegalArgumentException("Todos os conteúdos com disciplina devem pertencer à disciplina da prova.");
        }
    }

    private ExamKind resolveExamKind(ExamKind requestedKind, ExamKind fallbackKind) {
        return requestedKind == null ? fallbackKind : requestedKind;
    }

    private void validateQuestionCountForKind(ExamKind kind, int questionCount) {
        if (kind == ExamKind.SIMULADO && questionCount != 21) {
            throw new IllegalArgumentException("O simulado deve possuir exatamente 21 questões.");
        }
    }

    private List<BigDecimal> distributeScores(BigDecimal totalScore, int questionCount) {
        BigDecimal baseValue = totalScore.divide(BigDecimal.valueOf(questionCount), 2, RoundingMode.DOWN);
        BigDecimal assigned = baseValue.multiply(BigDecimal.valueOf(questionCount - 1));
        List<BigDecimal> points = new ArrayList<>();
        for (int index = 0; index < questionCount - 1; index++) {
            points.add(baseValue);
        }
        points.add(totalScore.subtract(assigned));
        return points;
    }

    private String normalizeRequired(String value) {
        return value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
