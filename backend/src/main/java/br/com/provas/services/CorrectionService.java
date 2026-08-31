package br.com.provas.services;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.provas.dtos.corrections.CorrectionAnswerRequest;
import br.com.provas.dtos.corrections.CorrectionAnswerResponse;
import br.com.provas.dtos.corrections.CorrectionRequest;
import br.com.provas.dtos.corrections.CorrectionResponse;
import br.com.provas.entities.AlternativeEntity;
import br.com.provas.entities.AnswerKeyEntity;
import br.com.provas.entities.AnswerKeyItemEntity;
import br.com.provas.entities.CorrectionEntity;
import br.com.provas.entities.CorrectionStatus;
import br.com.provas.entities.ExamEntity;
import br.com.provas.entities.ExamQuestionEntity;
import br.com.provas.entities.ExamVersionAlternativeEntity;
import br.com.provas.entities.ExamVersionEntity;
import br.com.provas.entities.ExamVersionQuestionEntity;
import br.com.provas.entities.StudentAnswerEntity;
import br.com.provas.entities.StudentAnswerStatus;
import br.com.provas.entities.StudentEntity;
import br.com.provas.exceptions.NotFoundException;
import br.com.provas.repositories.AlternativeRepository;
import br.com.provas.repositories.AnswerKeyItemRepository;
import br.com.provas.repositories.AnswerKeyRepository;
import br.com.provas.repositories.CorrectionRepository;
import br.com.provas.repositories.ExamQuestionRepository;
import br.com.provas.repositories.ExamRepository;
import br.com.provas.repositories.ExamVersionAlternativeRepository;
import br.com.provas.repositories.ExamVersionQuestionRepository;
import br.com.provas.repositories.ExamVersionRepository;
import br.com.provas.repositories.StudentAnswerRepository;

@Service
public class CorrectionService {

    private final CorrectionRepository correctionRepository;
    private final StudentAnswerRepository studentAnswerRepository;
    private final ExamRepository examRepository;
    private final ExamQuestionRepository examQuestionRepository;
    private final ExamVersionRepository examVersionRepository;
    private final ExamVersionQuestionRepository examVersionQuestionRepository;
    private final ExamVersionAlternativeRepository examVersionAlternativeRepository;
    private final AlternativeRepository alternativeRepository;
    private final AnswerKeyRepository answerKeyRepository;
    private final AnswerKeyItemRepository answerKeyItemRepository;
    private final StudentService studentService;
    private final ExamApplicationService examApplicationService;

    public CorrectionService(
            CorrectionRepository correctionRepository,
            StudentAnswerRepository studentAnswerRepository,
            ExamRepository examRepository,
            ExamQuestionRepository examQuestionRepository,
            ExamVersionRepository examVersionRepository,
            ExamVersionQuestionRepository examVersionQuestionRepository,
            ExamVersionAlternativeRepository examVersionAlternativeRepository,
            AlternativeRepository alternativeRepository,
            AnswerKeyRepository answerKeyRepository,
            AnswerKeyItemRepository answerKeyItemRepository,
            StudentService studentService,
            ExamApplicationService examApplicationService) {
        this.correctionRepository = correctionRepository;
        this.studentAnswerRepository = studentAnswerRepository;
        this.examRepository = examRepository;
        this.examQuestionRepository = examQuestionRepository;
        this.examVersionRepository = examVersionRepository;
        this.examVersionQuestionRepository = examVersionQuestionRepository;
        this.examVersionAlternativeRepository = examVersionAlternativeRepository;
        this.alternativeRepository = alternativeRepository;
        this.answerKeyRepository = answerKeyRepository;
        this.answerKeyItemRepository = answerKeyItemRepository;
        this.studentService = studentService;
        this.examApplicationService = examApplicationService;
    }

    @Transactional
    public CorrectionResponse create(UUID teacherId, CorrectionRequest request) {
        VersionContext context = loadVersionContext(teacherId, request.examVersionId());
        StudentReference student = resolveStudent(teacherId, request);
        validateApplicationAssignment(teacherId, student, request.examVersionId());
        CorrectionEntity correction = new CorrectionEntity(
                teacherId,
                request.examVersionId(),
                student.id(),
                student.name(),
                student.identifier(),
                student.classGroup());
        Draft draft = buildDraft(correction.getId(), context, request);
        correction.update(
                student.id(),
                student.name(),
                student.identifier(),
                student.classGroup(),
                draft.summary());
        correctionRepository.save(correction);
        studentAnswerRepository.saveAll(draft.answers());
        return toResponse(correction, context, draft.answers());
    }

    @Transactional
    public CorrectionResponse update(UUID teacherId, UUID correctionId, CorrectionRequest request) {
        CorrectionEntity correction = findCorrection(teacherId, correctionId);
        if (correction.getStatus() != CorrectionStatus.NEEDS_REVIEW) {
            throw new IllegalStateException("Somente correções pendentes de revisão podem ser alteradas.");
        }
        if (!correction.getExamVersionId().equals(request.examVersionId())) {
            throw new IllegalArgumentException("A versão informada não corresponde a esta correção.");
        }

        VersionContext context = loadVersionContext(teacherId, correction.getExamVersionId());
        StudentReference student = resolveStudent(teacherId, request);
        validateApplicationAssignment(teacherId, student, correction.getExamVersionId());
        Draft draft = buildDraft(correction.getId(), context, request);
        correction.update(
                student.id(),
                student.name(),
                student.identifier(),
                student.classGroup(),
                draft.summary());
        studentAnswerRepository.deleteByCorrectionId(correctionId);
        studentAnswerRepository.saveAll(draft.answers());
        correctionRepository.save(correction);
        return toResponse(correction, context, draft.answers());
    }

    @Transactional
    public CorrectionResponse confirm(UUID teacherId, UUID correctionId) {
        CorrectionEntity correction = findCorrection(teacherId, correctionId);
        VersionContext context = loadVersionContext(teacherId, correction.getExamVersionId());
        List<StudentAnswerEntity> answers = studentAnswerRepository.findAllByCorrectionId(correctionId);
        validatePersistedAnswers(context, answers);
        correction.confirm();
        answers.forEach(StudentAnswerEntity::markConfirmed);
        correctionRepository.save(correction);
        studentAnswerRepository.saveAll(answers);
        return toResponse(correction, context, answers);
    }

    @Transactional(readOnly = true)
    public List<CorrectionResponse> list(UUID teacherId) {
        return correctionRepository.findAllByTeacherIdOrderByCreatedAtDesc(teacherId).stream()
                .map(correction -> toResponse(
                        correction,
                        loadVersionContext(teacherId, correction.getExamVersionId()),
                        studentAnswerRepository.findAllByCorrectionId(correction.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public CorrectionResponse get(UUID teacherId, UUID correctionId) {
        CorrectionEntity correction = findCorrection(teacherId, correctionId);
        return toResponse(
                correction,
                loadVersionContext(teacherId, correction.getExamVersionId()),
                studentAnswerRepository.findAllByCorrectionId(correctionId));
    }

    @Transactional
    public void recalculateForExam(UUID teacherId, UUID examId) {
        List<ExamVersionEntity> versions = examVersionRepository.findAllByExamIdOrderByLabelAsc(examId);
        for (ExamVersionEntity version : versions) {
            VersionContext context = loadVersionContext(teacherId, version.getId());
            List<CorrectionEntity> corrections = correctionRepository
                    .findAllByTeacherIdAndExamVersionIdAndStatus(teacherId, version.getId(), CorrectionStatus.NEEDS_REVIEW);

            for (CorrectionEntity correction : corrections) {
                List<StudentAnswerEntity> answers = studentAnswerRepository.findAllByCorrectionId(correction.getId());
                int correctCount = 0;
                int wrongCount = 0;
                int blankCount = 0;
                int ambiguousCount = 0;
                BigDecimal score = BigDecimal.ZERO;

                for (StudentAnswerEntity answer : answers) {
                    ExamVersionQuestionEntity versionQuestion = context.questionsById().get(answer.getExamVersionQuestionId());
                    if (versionQuestion == null) {
                        continue;
                    }
                    ExamQuestionEntity examQuestion = context.examQuestionsById().get(versionQuestion.getExamQuestionId());
                    boolean isCancelled = examQuestion != null && examQuestion.isCancelled();

                    if (isCancelled) {
                        answer.setCorrect(true);
                        correctCount++;
                        if (examQuestion != null && examQuestion.getPoints() != null) {
                            score = score.add(examQuestion.getPoints());
                        }
                    } else if (answer.getStatus() == StudentAnswerStatus.BLANK) {
                        blankCount++;
                        answer.setCorrect(null);
                    } else if (answer.getStatus() == StudentAnswerStatus.AMBIGUOUS || answer.getStatus() == StudentAnswerStatus.NEEDS_REVIEW) {
                        ambiguousCount++;
                        answer.setCorrect(null);
                    } else {
                        UUID correctAlt = context.correctAlternativeByQuestionId().get(versionQuestion.getId());
                        boolean isCorrect = answer.getFinalAlternativeId() != null
                                ? answer.getFinalAlternativeId().equals(correctAlt)
                                : (answer.getDetectedAlternativeId() != null && answer.getDetectedAlternativeId().equals(correctAlt));
                        answer.setCorrect(isCorrect);
                        if (isCorrect) {
                            correctCount++;
                            if (examQuestion != null && examQuestion.getPoints() != null) {
                                score = score.add(examQuestion.getPoints());
                            }
                        } else {
                            wrongCount++;
                        }
                    }
                }

                studentAnswerRepository.saveAll(answers);
                correction.update(
                        correction.getStudentId(),
                        correction.getStudentName(),
                        correction.getStudentIdentifier(),
                        correction.getClassGroup(),
                        new CorrectionEntity.Summary(score, correctCount, wrongCount, blankCount, ambiguousCount));
                correctionRepository.save(correction);
            }
        }
    }

    @Transactional(readOnly = true)
    public boolean hasConfirmedCorrectionsForExam(UUID teacherId, UUID examId) {
        List<UUID> versionIds = examVersionRepository.findAllByExamIdOrderByLabelAsc(examId).stream()
                .map(ExamVersionEntity::getId)
                .toList();
        return !versionIds.isEmpty()
                && correctionRepository.existsByTeacherIdAndExamVersionIdInAndStatus(
                        teacherId,
                        versionIds,
                        CorrectionStatus.CONFIRMED);
    }

    private Draft buildDraft(UUID correctionId, VersionContext context, CorrectionRequest request) {
        Map<UUID, CorrectionAnswerRequest> requestByQuestionId = indexRequestAnswers(request.answers());
        if (!requestByQuestionId.keySet().equals(context.questionsById().keySet())) {
            throw new IllegalArgumentException("A correção precisa informar exatamente uma resposta para cada questão da versão.");
        }

        int correctCount = 0;
        int wrongCount = 0;
        int blankCount = 0;
        int ambiguousCount = 0;
        BigDecimal score = BigDecimal.ZERO;
        List<StudentAnswerEntity> answers = new ArrayList<>();

        for (ExamVersionQuestionEntity question : context.questionsById().values()) {
            CorrectionAnswerRequest answer = requestByQuestionId.get(question.getId());
            SelectedAnswer selected = resolveSelectedAnswer(context, question, answer);
            ExamQuestionEntity examQuestion = context.examQuestionsById().get(question.getExamQuestionId());
            boolean isCancelled = examQuestion != null && examQuestion.isCancelled();
            Boolean correct = null;

            if (isCancelled) {
                correct = true;
                correctCount++;
                if (examQuestion != null && examQuestion.getPoints() != null) {
                    score = score.add(examQuestion.getPoints());
                }
                if (answer.status() == StudentAnswerStatus.BLANK) {
                    blankCount++;
                } else if (answer.status() == StudentAnswerStatus.AMBIGUOUS || answer.status() == StudentAnswerStatus.NEEDS_REVIEW) {
                    ambiguousCount++;
                }
            } else if (answer.status() == StudentAnswerStatus.BLANK) {
                blankCount++;
            } else if (answer.status() == StudentAnswerStatus.AMBIGUOUS || answer.status() == StudentAnswerStatus.NEEDS_REVIEW) {
                ambiguousCount++;
            } else {
                correct = selected.alternativeId().equals(context.correctAlternativeByQuestionId().get(question.getId()));
                if (correct) {
                    correctCount++;
                    if (examQuestion != null && examQuestion.getPoints() != null) {
                        score = score.add(examQuestion.getPoints());
                    }
                } else {
                    wrongCount++;
                }
            }

            answers.add(new StudentAnswerEntity(
                    correctionId,
                    question.getId(),
                    selected.alternativeId(),
                    selected.letter(),
                    answer.status(),
                    correct));
        }

        return new Draft(
                answers,
                new CorrectionEntity.Summary(score, correctCount, wrongCount, blankCount, ambiguousCount));
    }

    private Map<UUID, CorrectionAnswerRequest> indexRequestAnswers(List<CorrectionAnswerRequest> answers) {
        Map<UUID, CorrectionAnswerRequest> result = new HashMap<>();
        for (CorrectionAnswerRequest answer : answers) {
            if (result.put(answer.examVersionQuestionId(), answer) != null) {
                throw new IllegalArgumentException("Uma questão não pode receber mais de uma resposta na mesma correção.");
            }
            if (answer.status() == StudentAnswerStatus.CONFIRMED) {
                throw new IllegalArgumentException("O status confirmado é definido somente pelo servidor.");
            }
        }
        return result;
    }

    private void validateApplicationAssignment(UUID teacherId, StudentReference student, UUID examVersionId) {
        if (student.id() != null) {
            examApplicationService.validateAssignedVersion(teacherId, student.id(), examVersionId);
        }
    }

    private SelectedAnswer resolveSelectedAnswer(
            VersionContext context,
            ExamVersionQuestionEntity question,
            CorrectionAnswerRequest answer) {
        UUID selectedAlternativeId = answer.selectedAlternativeId();
        if (selectedAlternativeId == null) {
            if (answer.status() == StudentAnswerStatus.DETECTED) {
                throw new IllegalArgumentException("Uma resposta detectada precisa indicar uma alternativa.");
            }
            return new SelectedAnswer(null, null);
        }
        if (answer.status() == StudentAnswerStatus.BLANK || answer.status() == StudentAnswerStatus.AMBIGUOUS) {
            throw new IllegalArgumentException("Respostas em branco ou ambíguas não podem indicar uma alternativa definitiva.");
        }

        ExamVersionAlternativeEntity alternative = context.alternativesByQuestionId().get(question.getId()).stream()
                .filter(link -> link.getAlternativeId().equals(selectedAlternativeId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("A alternativa informada não pertence à questão desta versão."));
        return new SelectedAnswer(selectedAlternativeId, letterFor(alternative.getPosition()));
    }

    private VersionContext loadVersionContext(UUID teacherId, UUID versionId) {
        ExamVersionEntity version = examVersionRepository.findById(versionId)
                .orElseThrow(() -> new NotFoundException("Versão da prova não encontrada."));
        ExamEntity exam = examRepository.findByIdAndTeacherId(version.getExamId(), teacherId)
                .orElseThrow(() -> new NotFoundException("Versão da prova não encontrada."));
        List<ExamVersionQuestionEntity> questions = examVersionQuestionRepository.findAllByExamVersionIdOrderByPositionAsc(versionId);
        if (questions.isEmpty()) {
            throw new IllegalStateException("A versão não possui questões para correção.");
        }

        Map<UUID, ExamVersionQuestionEntity> questionsById = new HashMap<>();
        for (ExamVersionQuestionEntity question : questions) {
            questionsById.put(question.getId(), question);
        }

        Map<UUID, List<ExamVersionAlternativeEntity>> alternativesByQuestionId = new HashMap<>();
        List<UUID> questionIds = questions.stream().map(ExamVersionQuestionEntity::getId).toList();
        List<UUID> alternativeIds = new ArrayList<>();
        for (ExamVersionAlternativeEntity link : examVersionAlternativeRepository
                .findAllByExamVersionQuestionIdInOrderByExamVersionQuestionIdAscPositionAsc(questionIds)) {
            alternativesByQuestionId.computeIfAbsent(link.getExamVersionQuestionId(), ignored -> new ArrayList<>()).add(link);
            alternativeIds.add(link.getAlternativeId());
        }
        if (!alternativesByQuestionId.keySet().equals(questionsById.keySet())) {
            throw new IllegalStateException("A versão possui questões sem alternativas persistidas.");
        }
        Map<UUID, AlternativeEntity> alternativesById = new HashMap<>();
        for (AlternativeEntity alternative : alternativeRepository.findAllById(alternativeIds)) {
            alternativesById.put(alternative.getId(), alternative);
        }
        if (alternativesById.size() != new HashSet<>(alternativeIds).size()) {
            throw new IllegalStateException("A versão possui alternativas indisponíveis para correção.");
        }

        AnswerKeyEntity answerKey = answerKeyRepository.findByExamVersionId(versionId)
                .orElseThrow(() -> new IllegalStateException("O gabarito da versão não foi encontrado."));
        Map<UUID, UUID> correctAlternativeByQuestionId = new HashMap<>();
        for (AnswerKeyItemEntity item : answerKeyItemRepository.findAllByAnswerKeyIdOrderByQuestionPositionAsc(answerKey.getId())) {
            correctAlternativeByQuestionId.put(item.getExamVersionQuestionId(), item.getCorrectAlternativeId());
        }
        if (!correctAlternativeByQuestionId.keySet().equals(questionsById.keySet())) {
            throw new IllegalStateException("O gabarito da versão está incompleto.");
        }

        Map<UUID, ExamQuestionEntity> examQuestionsById = new HashMap<>();
        for (ExamQuestionEntity question : examQuestionRepository.findAllByExamIdOrderByPositionAsc(exam.getId())) {
            examQuestionsById.put(question.getId(), question);
        }
        Set<UUID> requiredExamQuestionIds = new HashSet<>();
        for (ExamVersionQuestionEntity question : questions) {
            requiredExamQuestionIds.add(question.getExamQuestionId());
        }
        if (!examQuestionsById.keySet().containsAll(requiredExamQuestionIds)) {
            throw new IllegalStateException("A prova original não possui a pontuação necessária para correção.");
        }

        return new VersionContext(
                exam,
                version,
                questionsById,
                alternativesByQuestionId,
                alternativesById,
                correctAlternativeByQuestionId,
                examQuestionsById);
    }

    private void validatePersistedAnswers(VersionContext context, List<StudentAnswerEntity> answers) {
        if (answers.size() != context.questionsById().size()) {
            throw new IllegalStateException("A correção está incompleta e não pode ser confirmada.");
        }
        Set<UUID> questionIds = new HashSet<>();
        for (StudentAnswerEntity answer : answers) {
            if (!context.questionsById().containsKey(answer.getExamVersionQuestionId()) || !questionIds.add(answer.getExamVersionQuestionId())) {
                throw new IllegalStateException("A correção possui respostas inválidas e não pode ser confirmada.");
            }
        }
    }

    private CorrectionResponse toResponse(CorrectionEntity correction, VersionContext context, List<StudentAnswerEntity> answers) {
        Map<UUID, StudentAnswerEntity> answersByQuestionId = new HashMap<>();
        for (StudentAnswerEntity answer : answers) {
            answersByQuestionId.put(answer.getExamVersionQuestionId(), answer);
        }

        List<CorrectionAnswerResponse> responseAnswers = context.questionsById().values().stream()
                .sorted((left, right) -> Integer.compare(left.getPosition(), right.getPosition()))
                .map(question -> toAnswerResponse(context, question, answersByQuestionId.get(question.getId())))
                .toList();

        return new CorrectionResponse(
                correction.getId(),
                correction.getExamVersionId(),
                context.exam().getTitle(),
                context.version().getLabel(),
                correction.getStudentId(),
                correction.getStudentName(),
                correction.getStudentIdentifier(),
                correction.getClassGroup(),
                correction.getStatus(),
                correction.getScore(),
                context.exam().getTotalScore(),
                correction.getCorrectCount(),
                correction.getWrongCount(),
                correction.getBlankCount(),
                correction.getAmbiguousCount(),
                correction.getReviewedAt(),
                correction.getCreatedAt(),
                responseAnswers);
    }

    private CorrectionAnswerResponse toAnswerResponse(
            VersionContext context,
            ExamVersionQuestionEntity question,
            StudentAnswerEntity answer) {
        if (answer == null) {
            throw new IllegalStateException("A correção está sem resposta para uma questão da versão.");
        }
        String selectedLetter = answer.getFinalAlternativeId() == null
                ? null
                : context.alternativesByQuestionId().get(question.getId()).stream()
                        .filter(link -> link.getAlternativeId().equals(answer.getFinalAlternativeId()))
                        .findFirst()
                        .map(link -> letterFor(link.getPosition()))
                        .orElseThrow(() -> new IllegalStateException("A correção possui uma alternativa inválida."));
        UUID correctAlternativeId = context.correctAlternativeByQuestionId().get(question.getId());
        String correctLetter = context.alternativesByQuestionId().get(question.getId()).stream()
                .filter(link -> link.getAlternativeId().equals(correctAlternativeId))
                .findFirst()
                .map(link -> letterFor(link.getPosition()))
                .orElseThrow(() -> new IllegalStateException("O gabarito possui uma alternativa inválida."));
        return new CorrectionAnswerResponse(
                question.getId(),
                question.getPosition(),
                answer.getFinalAlternativeId(),
                selectedLetter,
                correctLetter,
                answer.getStatus(),
                answer.getCorrect(),
                context.examQuestionsById().get(question.getExamQuestionId()).isCancelled());
    }

    private CorrectionEntity findCorrection(UUID teacherId, UUID correctionId) {
        return correctionRepository.findByIdAndTeacherId(correctionId, teacherId)
                .orElseThrow(() -> new NotFoundException("Correção não encontrada."));
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private StudentReference resolveStudent(UUID teacherId, CorrectionRequest request) {
        if (request.studentId() != null) {
            StudentEntity student = studentService.findEntity(teacherId, request.studentId());
            return new StudentReference(student.getId(), student.getName(), student.getIdentifier(), student.getClassGroup());
        }
        String studentName = blankToNull(request.studentName());
        if (studentName == null) {
            throw new IllegalArgumentException("Informe o nome do aluno ou selecione um aluno cadastrado.");
        }
        return new StudentReference(
                null,
                studentName.replaceAll("\\s+", " "),
                blankToNull(request.studentIdentifier()),
                blankToNull(request.classGroup()));
    }

    private String letterFor(int position) {
        return String.valueOf((char) ('A' + position - 1));
    }

    private record Draft(List<StudentAnswerEntity> answers, CorrectionEntity.Summary summary) {
    }

    private record SelectedAnswer(UUID alternativeId, String letter) {
    }

    private record StudentReference(UUID id, String name, String identifier, String classGroup) {
    }

    private record VersionContext(
            ExamEntity exam,
            ExamVersionEntity version,
            Map<UUID, ExamVersionQuestionEntity> questionsById,
            Map<UUID, List<ExamVersionAlternativeEntity>> alternativesByQuestionId,
            Map<UUID, AlternativeEntity> alternativesById,
            Map<UUID, UUID> correctAlternativeByQuestionId,
            Map<UUID, ExamQuestionEntity> examQuestionsById) {
    }
}
