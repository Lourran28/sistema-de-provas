package br.com.provas.services;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.provas.dtos.versions.AnswerKeyItemResponse;
import br.com.provas.dtos.versions.ExamVersionAlternativeResponse;
import br.com.provas.dtos.versions.ExamVersionQuestionResponse;
import br.com.provas.dtos.versions.ExamVersionResponse;
import br.com.provas.entities.AlternativeEntity;
import br.com.provas.entities.AnswerKeyEntity;
import br.com.provas.entities.AnswerKeyItemEntity;
import br.com.provas.entities.ExamEntity;
import br.com.provas.entities.ExamQuestionEntity;
import br.com.provas.entities.ExamStatus;
import br.com.provas.entities.ExamVersionAlternativeEntity;
import br.com.provas.entities.ExamVersionEntity;
import br.com.provas.entities.ExamVersionQuestionEntity;
import br.com.provas.entities.QuestionEntity;
import br.com.provas.exceptions.NotFoundException;
import br.com.provas.repositories.AlternativeRepository;
import br.com.provas.repositories.AnswerKeyItemRepository;
import br.com.provas.repositories.AnswerKeyRepository;
import br.com.provas.repositories.ExamQuestionRepository;
import br.com.provas.repositories.ExamRepository;
import br.com.provas.repositories.ExamVersionAlternativeRepository;
import br.com.provas.repositories.ExamVersionQuestionRepository;
import br.com.provas.repositories.ExamVersionRepository;
import br.com.provas.repositories.QuestionRepository;

@Service
public class ExamVersionService {

    private static final List<String> OFFICIAL_LABELS = List.of("A", "B", "C");

    private final ExamRepository examRepository;
    private final ExamQuestionRepository examQuestionRepository;
    private final QuestionRepository questionRepository;
    private final AlternativeRepository alternativeRepository;
    private final ExamVersionRepository examVersionRepository;
    private final ExamVersionQuestionRepository examVersionQuestionRepository;
    private final ExamVersionAlternativeRepository examVersionAlternativeRepository;
    private final AnswerKeyRepository answerKeyRepository;
    private final AnswerKeyItemRepository answerKeyItemRepository;
    private final SecureRandom random = new SecureRandom();

    public ExamVersionService(
            ExamRepository examRepository,
            ExamQuestionRepository examQuestionRepository,
            QuestionRepository questionRepository,
            AlternativeRepository alternativeRepository,
            ExamVersionRepository examVersionRepository,
            ExamVersionQuestionRepository examVersionQuestionRepository,
            ExamVersionAlternativeRepository examVersionAlternativeRepository,
            AnswerKeyRepository answerKeyRepository,
            AnswerKeyItemRepository answerKeyItemRepository) {
        this.examRepository = examRepository;
        this.examQuestionRepository = examQuestionRepository;
        this.questionRepository = questionRepository;
        this.alternativeRepository = alternativeRepository;
        this.examVersionRepository = examVersionRepository;
        this.examVersionQuestionRepository = examVersionQuestionRepository;
        this.examVersionAlternativeRepository = examVersionAlternativeRepository;
        this.answerKeyRepository = answerKeyRepository;
        this.answerKeyItemRepository = answerKeyItemRepository;
    }

    @Transactional
    public List<ExamVersionResponse> generate(UUID teacherId, UUID examId) {
        ExamEntity exam = findExam(teacherId, examId);
        if (exam.getStatus() != ExamStatus.READY) {
            throw new IllegalArgumentException("A prova precisa estar aprovada antes de gerar versões oficiais.");
        }
        if (examVersionRepository.existsByExamId(examId)) {
            throw new IllegalStateException("As versões oficiais desta prova já foram geradas.");
        }

        List<ExamQuestionEntity> examQuestions = examQuestionRepository.findAllByExamIdOrderByPositionAsc(examId);
        if (examQuestions.isEmpty()) {
            throw new IllegalArgumentException("A prova precisa possuir questões antes de gerar versões.");
        }
        ensureDistinctQuestionIds(examQuestions);

        Map<UUID, QuestionEntity> questionsById = findQuestions(teacherId, examQuestions);
        Map<UUID, List<AlternativeEntity>> alternativesByQuestionId = findAlternatives(examQuestions, questionsById);

        List<ExamVersionEntity> versions = OFFICIAL_LABELS.stream()
                .map(label -> new ExamVersionEntity(examId, label))
                .toList();
        examVersionRepository.saveAll(versions);

        List<ExamVersionQuestionEntity> versionQuestions = new ArrayList<>();
        List<ExamVersionAlternativeEntity> versionAlternatives = new ArrayList<>();
        List<AnswerKeyEntity> answerKeys = new ArrayList<>();
        List<AnswerKeyItemEntity> answerKeyItems = new ArrayList<>();

        for (ExamVersionEntity version : versions) {
            AnswerKeyEntity answerKey = new AnswerKeyEntity(version.getId());
            answerKeys.add(answerKey);

            List<ExamQuestionEntity> shuffledQuestions = new ArrayList<>(examQuestions);
            Collections.shuffle(shuffledQuestions, random);
            for (int questionIndex = 0; questionIndex < shuffledQuestions.size(); questionIndex++) {
                ExamQuestionEntity examQuestion = shuffledQuestions.get(questionIndex);
                QuestionEntity question = questionsById.get(examQuestion.getQuestionId());
                ExamVersionQuestionEntity versionQuestion = new ExamVersionQuestionEntity(
                        version.getId(),
                        examQuestion.getId(),
                        question.getId(),
                        questionIndex + 1);
                versionQuestions.add(versionQuestion);

                List<AlternativeEntity> shuffledAlternatives = new ArrayList<>(alternativesByQuestionId.get(question.getId()));
                Collections.shuffle(shuffledAlternatives, random);
                AlternativeEntity correctAlternative = null;
                int correctPosition = 0;
                for (int alternativeIndex = 0; alternativeIndex < shuffledAlternatives.size(); alternativeIndex++) {
                    AlternativeEntity alternative = shuffledAlternatives.get(alternativeIndex);
                    int position = alternativeIndex + 1;
                    versionAlternatives.add(new ExamVersionAlternativeEntity(versionQuestion.getId(), alternative.getId(), position));
                    if (alternative.isCorrect()) {
                        correctAlternative = alternative;
                        correctPosition = position;
                    }
                }
                if (correctAlternative == null) {
                    throw new IllegalStateException("Não foi encontrada uma alternativa correta para uma questão da prova.");
                }
                answerKeyItems.add(new AnswerKeyItemEntity(
                        answerKey.getId(),
                        versionQuestion.getId(),
                        correctAlternative.getId(),
                        versionQuestion.getPosition(),
                        letterFor(correctPosition)));
            }
        }

        examVersionQuestionRepository.saveAll(versionQuestions);
        examVersionAlternativeRepository.saveAll(versionAlternatives);
        answerKeyRepository.saveAll(answerKeys);
        answerKeyItemRepository.saveAll(answerKeyItems);
        exam.markVersionsGenerated();
        examRepository.save(exam);

        return versions.stream().map(version -> toResponse(exam, version)).toList();
    }

    @Transactional(readOnly = true)
    public List<ExamVersionResponse> list(UUID teacherId, UUID examId) {
        ExamEntity exam = findExam(teacherId, examId);
        return examVersionRepository.findAllByExamIdOrderByLabelAsc(examId).stream()
                .map(version -> toResponse(exam, version))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ExamVersionResponse> listAll(UUID teacherId) {
        List<ExamEntity> exams = examRepository.findAllByTeacherIdAndArchivedFalseOrderByUpdatedAtDesc(teacherId);
        if (exams.isEmpty()) {
            return List.of();
        }
        Map<UUID, ExamEntity> examsById = new HashMap<>();
        for (ExamEntity exam : exams) {
            examsById.put(exam.getId(), exam);
        }
        return examVersionRepository.findAllByExamIdInOrderByGeneratedAtDesc(new ArrayList<>(examsById.keySet())).stream()
                .map(version -> toResponse(examsById.get(version.getExamId()), version))
                .toList();
    }

    @Transactional(readOnly = true)
    public ExamVersionResponse get(UUID teacherId, UUID versionId) {
        ExamVersionEntity version = examVersionRepository.findById(versionId)
                .orElseThrow(() -> new NotFoundException("Versão da prova não encontrada."));
        return toResponse(findExam(teacherId, version.getExamId()), version);
    }

    private Map<UUID, QuestionEntity> findQuestions(UUID teacherId, List<ExamQuestionEntity> examQuestions) {
        List<UUID> questionIds = examQuestions.stream().map(ExamQuestionEntity::getQuestionId).toList();
        Map<UUID, QuestionEntity> questions = new HashMap<>();
        for (QuestionEntity question : questionRepository.findAllByIdInAndTeacherId(questionIds, teacherId)) {
            questions.put(question.getId(), question);
        }
        if (questions.size() != questionIds.size()) {
            throw new NotFoundException("Uma questão da prova não está mais disponível para este professor.");
        }
        return questions;
    }

    private Map<UUID, List<AlternativeEntity>> findAlternatives(
            List<ExamQuestionEntity> examQuestions,
            Map<UUID, QuestionEntity> questionsById) {
        Map<UUID, List<AlternativeEntity>> alternativesByQuestion = new HashMap<>();
        for (ExamQuestionEntity examQuestion : examQuestions) {
            QuestionEntity question = questionsById.get(examQuestion.getQuestionId());
            List<AlternativeEntity> alternatives = alternativeRepository.findAllByQuestionIdOrderByPositionAsc(question.getId());
            long correctCount = alternatives.stream().filter(AlternativeEntity::isCorrect).count();
            if (alternatives.size() < 2 || correctCount != 1) {
                throw new IllegalStateException("Cada questão da prova precisa ter alternativas válidas e uma única resposta correta.");
            }
            alternativesByQuestion.put(question.getId(), alternatives);
        }
        return alternativesByQuestion;
    }

    private ExamVersionResponse toResponse(ExamEntity exam, ExamVersionEntity version) {
        List<ExamVersionQuestionEntity> versionQuestions = examVersionQuestionRepository
                .findAllByExamVersionIdOrderByPositionAsc(version.getId());
        Map<UUID, ExamQuestionEntity> examQuestionsById = new HashMap<>();
        for (ExamQuestionEntity examQuestion : examQuestionRepository.findAllByExamIdOrderByPositionAsc(exam.getId())) {
            examQuestionsById.put(examQuestion.getId(), examQuestion);
        }
        Map<UUID, QuestionEntity> questionsById = findQuestionsById(exam.getTeacherId(), versionQuestions);
        Map<UUID, List<ExamVersionAlternativeEntity>> alternativeLinksByQuestion = findAlternativeLinks(versionQuestions);
        Map<UUID, AlternativeEntity> alternativesById = findAlternativesById(alternativeLinksByQuestion.values());

        List<ExamVersionQuestionResponse> questions = versionQuestions.stream()
                .map(versionQuestion -> toQuestionResponse(
                        versionQuestion,
                        examQuestionsById.get(versionQuestion.getExamQuestionId()),
                        questionsById.get(versionQuestion.getOriginalQuestionId()),
                        alternativeLinksByQuestion.getOrDefault(versionQuestion.getId(), List.of()),
                        alternativesById))
                .toList();

        AnswerKeyEntity answerKey = answerKeyRepository.findByExamVersionId(version.getId())
                .orElseThrow(() -> new IllegalStateException("O gabarito desta versão não foi encontrado."));
        List<AnswerKeyItemResponse> answerKeyItems = answerKeyItemRepository.findAllByAnswerKeyIdOrderByQuestionPositionAsc(answerKey.getId())
                .stream()
                .map(item -> new AnswerKeyItemResponse(
                        item.getQuestionPosition(),
                        item.getCorrectAlternativeId(),
                        item.getCorrectLetter()))
                .toList();

        return new ExamVersionResponse(
                version.getId(),
                exam.getId(),
                exam.getTitle(),
                version.getLabel(),
                version.getStatus(),
                version.getGeneratedAt(),
                questions,
                answerKeyItems);
    }

    private Map<UUID, QuestionEntity> findQuestionsById(UUID teacherId, List<ExamVersionQuestionEntity> versionQuestions) {
        if (versionQuestions.isEmpty()) {
            return Map.of();
        }
        List<UUID> questionIds = versionQuestions.stream().map(ExamVersionQuestionEntity::getOriginalQuestionId).toList();
        Map<UUID, QuestionEntity> result = new HashMap<>();
        for (QuestionEntity question : questionRepository.findAllByIdInAndTeacherId(questionIds, teacherId)) {
            result.put(question.getId(), question);
        }
        if (result.size() != questionIds.size()) {
            throw new NotFoundException("Uma questão da versão não está mais disponível para este professor.");
        }
        return result;
    }

    private Map<UUID, List<ExamVersionAlternativeEntity>> findAlternativeLinks(List<ExamVersionQuestionEntity> versionQuestions) {
        if (versionQuestions.isEmpty()) {
            return Map.of();
        }
        Map<UUID, List<ExamVersionAlternativeEntity>> result = new LinkedHashMap<>();
        List<UUID> versionQuestionIds = versionQuestions.stream().map(ExamVersionQuestionEntity::getId).toList();
        for (ExamVersionAlternativeEntity link : examVersionAlternativeRepository
                .findAllByExamVersionQuestionIdInOrderByExamVersionQuestionIdAscPositionAsc(versionQuestionIds)) {
            result.computeIfAbsent(link.getExamVersionQuestionId(), ignored -> new ArrayList<>()).add(link);
        }
        return result;
    }

    private Map<UUID, AlternativeEntity> findAlternativesById(Collection<List<ExamVersionAlternativeEntity>> links) {
        List<UUID> alternativeIds = links.stream()
                .flatMap(List::stream)
                .map(ExamVersionAlternativeEntity::getAlternativeId)
                .toList();
        if (alternativeIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, AlternativeEntity> result = new HashMap<>();
        for (AlternativeEntity alternative : alternativeRepository.findAllById(alternativeIds)) {
            result.put(alternative.getId(), alternative);
        }
        if (result.size() != alternativeIds.size()) {
            throw new NotFoundException("Uma alternativa da versão não está mais disponível.");
        }
        return result;
    }

    private ExamVersionQuestionResponse toQuestionResponse(
            ExamVersionQuestionEntity versionQuestion,
            ExamQuestionEntity examQuestion,
            QuestionEntity question,
            List<ExamVersionAlternativeEntity> alternativeLinks,
            Map<UUID, AlternativeEntity> alternativesById) {
        if (examQuestion == null || question == null) {
            throw new IllegalStateException("A composição da versão está incompleta.");
        }
        List<ExamVersionAlternativeResponse> alternatives = alternativeLinks.stream()
                .map(link -> {
                    AlternativeEntity alternative = alternativesById.get(link.getAlternativeId());
                    if (alternative == null) {
                        throw new IllegalStateException("A composição da versão contém uma alternativa inválida.");
                    }
                    return new ExamVersionAlternativeResponse(alternative.getId(), alternative.getText(), link.getPosition());
                })
                .toList();
        return new ExamVersionQuestionResponse(
                versionQuestion.getId(),
                versionQuestion.getOriginalQuestionId(),
                versionQuestion.getPosition(),
                examQuestion.getPoints(),
                question.getStatement(),
                question.getImageUrl(),
                alternatives);
    }

    private ExamEntity findExam(UUID teacherId, UUID examId) {
        return examRepository.findByIdAndTeacherId(examId, teacherId)
                .orElseThrow(() -> new NotFoundException("Prova não encontrada."));
    }

    private void ensureDistinctQuestionIds(List<ExamQuestionEntity> examQuestions) {
        long distinctCount = examQuestions.stream().map(ExamQuestionEntity::getQuestionId).distinct().count();
        if (distinctCount != examQuestions.size()) {
            throw new IllegalStateException("A prova contém questões duplicadas e não pode gerar versões.");
        }
    }

    private String letterFor(int position) {
        StringBuilder result = new StringBuilder();
        int current = position;
        while (current > 0) {
            current--;
            result.insert(0, (char) ('A' + (current % 26)));
            current /= 26;
        }
        return result.toString();
    }
}
