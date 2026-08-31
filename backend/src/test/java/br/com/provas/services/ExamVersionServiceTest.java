package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.provas.dtos.versions.AnswerKeyItemResponse;
import br.com.provas.dtos.versions.ExamVersionQuestionResponse;
import br.com.provas.dtos.versions.ExamVersionResponse;
import br.com.provas.entities.AlternativeEntity;
import br.com.provas.entities.AnswerKeyEntity;
import br.com.provas.entities.AnswerKeyItemEntity;
import br.com.provas.entities.ExamEntity;
import br.com.provas.entities.ExamQuestionEntity;
import br.com.provas.entities.ExamVersionAlternativeEntity;
import br.com.provas.entities.ExamVersionEntity;
import br.com.provas.entities.ExamVersionQuestionEntity;
import br.com.provas.entities.QuestionDifficulty;
import br.com.provas.entities.QuestionEntity;
import br.com.provas.entities.QuestionType;
import br.com.provas.repositories.AlternativeRepository;
import br.com.provas.repositories.AnswerKeyItemRepository;
import br.com.provas.repositories.AnswerKeyRepository;
import br.com.provas.repositories.ExamQuestionRepository;
import br.com.provas.repositories.ExamRepository;
import br.com.provas.repositories.ExamVersionAlternativeRepository;
import br.com.provas.repositories.ExamVersionQuestionRepository;
import br.com.provas.repositories.ExamVersionRepository;
import br.com.provas.repositories.QuestionRepository;

@ExtendWith(MockitoExtension.class)
class ExamVersionServiceTest {

    @Mock
    private ExamRepository examRepository;

    @Mock
    private ExamQuestionRepository examQuestionRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private AlternativeRepository alternativeRepository;

    @Mock
    private ExamVersionRepository examVersionRepository;

    @Mock
    private ExamVersionQuestionRepository examVersionQuestionRepository;

    @Mock
    private ExamVersionAlternativeRepository examVersionAlternativeRepository;

    @Mock
    private AnswerKeyRepository answerKeyRepository;

    @Mock
    private AnswerKeyItemRepository answerKeyItemRepository;

    @InjectMocks
    private ExamVersionService examVersionService;

    private final List<ExamVersionEntity> savedVersions = new ArrayList<>();
    private final List<ExamVersionQuestionEntity> savedVersionQuestions = new ArrayList<>();
    private final List<ExamVersionAlternativeEntity> savedVersionAlternatives = new ArrayList<>();
    private final List<AnswerKeyEntity> savedAnswerKeys = new ArrayList<>();
    private final List<AnswerKeyItemEntity> savedAnswerKeyItems = new ArrayList<>();

    @SuppressWarnings("unchecked")
    private void configurePersistence() {
        when(examVersionRepository.saveAll(any())).thenAnswer(invocation -> {
            List<ExamVersionEntity> values = invocation.getArgument(0);
            savedVersions.addAll(values);
            return values;
        });
        when(examVersionQuestionRepository.saveAll(any())).thenAnswer(invocation -> {
            List<ExamVersionQuestionEntity> values = invocation.getArgument(0);
            savedVersionQuestions.addAll(values);
            return values;
        });
        when(examVersionAlternativeRepository.saveAll(any())).thenAnswer(invocation -> {
            List<ExamVersionAlternativeEntity> values = invocation.getArgument(0);
            savedVersionAlternatives.addAll(values);
            return values;
        });
        when(answerKeyRepository.saveAll(any())).thenAnswer(invocation -> {
            List<AnswerKeyEntity> values = invocation.getArgument(0);
            savedAnswerKeys.addAll(values);
            return values;
        });
        when(answerKeyItemRepository.saveAll(any())).thenAnswer(invocation -> {
            List<AnswerKeyItemEntity> values = invocation.getArgument(0);
            savedAnswerKeyItems.addAll(values);
            return values;
        });
        when(examVersionQuestionRepository.findAllByExamVersionIdOrderByPositionAsc(any())).thenAnswer(invocation -> savedVersionQuestions.stream()
                .filter(question -> question.getExamVersionId().equals(invocation.getArgument(0)))
                .sorted(Comparator.comparingInt(ExamVersionQuestionEntity::getPosition))
                .toList());
        when(examVersionAlternativeRepository.findAllByExamVersionQuestionIdInOrderByExamVersionQuestionIdAscPositionAsc(any())).thenAnswer(invocation -> {
            List<UUID> versionQuestionIds = invocation.getArgument(0);
            return savedVersionAlternatives.stream()
                    .filter(alternative -> versionQuestionIds.contains(alternative.getExamVersionQuestionId()))
                    .sorted(Comparator.comparingInt(ExamVersionAlternativeEntity::getPosition))
                    .toList();
        });
        when(answerKeyRepository.findByExamVersionId(any())).thenAnswer(invocation -> savedAnswerKeys.stream()
                .filter(answerKey -> answerKey.getExamVersionId().equals(invocation.getArgument(0)))
                .findFirst());
        when(answerKeyItemRepository.findAllByAnswerKeyIdOrderByQuestionPositionAsc(any())).thenAnswer(invocation -> savedAnswerKeyItems.stream()
                .filter(item -> item.getAnswerKeyId().equals(invocation.getArgument(0)))
                .sorted(Comparator.comparingInt(AnswerKeyItemEntity::getQuestionPosition))
                .toList());
    }

    @Test
    void generatesThreePersistentVersionsWithoutLosingQuestionsOrCorrectAnswers() {
        configurePersistence();
        Fixture fixture = fixture(true);

        List<ExamVersionResponse> versions = examVersionService.generate(fixture.teacherId(), fixture.exam().getId());

        assertEquals(3, versions.size());
        assertEquals(3, savedVersions.size());
        assertEquals(9, savedVersionQuestions.size());
        assertEquals(27, savedVersionAlternatives.size());
        assertEquals(3, savedAnswerKeys.size());
        assertEquals(9, savedAnswerKeyItems.size());
        assertEquals("VERSIONS_GENERATED", fixture.exam().getStatus().name());

        for (ExamVersionResponse version : versions) {
            assertEquals(List.of(1, 2, 3), version.questions().stream().map(ExamVersionQuestionResponse::position).toList());
            assertEquals(
                    fixture.questions().stream().map(QuestionEntity::getId).sorted().toList(),
                    version.questions().stream().map(ExamVersionQuestionResponse::originalQuestionId).sorted().toList());

            Map<Integer, AnswerKeyItemResponse> keyByPosition = new HashMap<>();
            version.answerKey().forEach(item -> keyByPosition.put(item.questionPosition(), item));
            assertEquals(3, keyByPosition.size());

            for (ExamVersionQuestionResponse question : version.questions()) {
                assertEquals(3, question.alternatives().size());
                assertEquals(3, question.alternatives().stream().map(alternative -> alternative.alternativeId()).distinct().count());
                AnswerKeyItemResponse answer = keyByPosition.get(question.position());
                UUID expectedCorrectAlternativeId = fixture.correctAlternativeByQuestionId().get(question.originalQuestionId());
                assertEquals(expectedCorrectAlternativeId, answer.correctAlternativeId());
                int correctPosition = question.alternatives().stream()
                        .filter(alternative -> alternative.alternativeId().equals(expectedCorrectAlternativeId))
                        .findFirst()
                        .orElseThrow()
                        .position();
                assertEquals(letterFor(correctPosition), answer.correctLetter());
            }
        }
        verify(examRepository).save(fixture.exam());
    }

    @Test
    void rejectsVersionGenerationBeforeApproval() {
        UUID teacherId = UUID.randomUUID();
        ExamEntity exam = new ExamEntity(
                teacherId,
                null,
                "Avaliação pendente",
                null,
                null,
                null,
                null,
                null,
                new BigDecimal("10.00"),
                1);
        when(examRepository.findByIdAndTeacherId(exam.getId(), teacherId)).thenReturn(Optional.of(exam));

        assertThrows(IllegalArgumentException.class, () -> examVersionService.generate(teacherId, exam.getId()));

        verify(examVersionRepository, never()).saveAll(any());
    }

    private Fixture fixture(boolean approved) {
        UUID teacherId = UUID.randomUUID();
        ExamEntity exam = new ExamEntity(
                teacherId,
                null,
                "Avaliação",
                null,
                null,
                null,
                null,
                null,
                new BigDecimal("10.00"),
                3);
        if (approved) {
            exam.approve();
        }

        List<QuestionEntity> questions = List.of(
                new QuestionEntity(teacherId, null, "Questão 1", QuestionType.MULTIPLE_CHOICE, QuestionDifficulty.MEDIUM),
                new QuestionEntity(teacherId, null, "Questão 2", QuestionType.MULTIPLE_CHOICE, QuestionDifficulty.MEDIUM),
                new QuestionEntity(teacherId, null, "Questão 3", QuestionType.MULTIPLE_CHOICE, QuestionDifficulty.MEDIUM));
        List<ExamQuestionEntity> examQuestions = List.of(
                new ExamQuestionEntity(exam.getId(), questions.get(0).getId(), 1, new BigDecimal("3.33")),
                new ExamQuestionEntity(exam.getId(), questions.get(1).getId(), 2, new BigDecimal("3.33")),
                new ExamQuestionEntity(exam.getId(), questions.get(2).getId(), 3, new BigDecimal("3.34")));

        Map<UUID, List<AlternativeEntity>> alternativesByQuestionId = new HashMap<>();
        Map<UUID, UUID> correctAlternativeByQuestionId = new HashMap<>();
        List<AlternativeEntity> allAlternatives = new ArrayList<>();
        for (QuestionEntity question : questions) {
            List<AlternativeEntity> alternatives = List.of(
                    new AlternativeEntity(question.getId(), "Alternativa 1", 1, false),
                    new AlternativeEntity(question.getId(), "Alternativa 2", 2, true),
                    new AlternativeEntity(question.getId(), "Alternativa 3", 3, false));
            alternativesByQuestionId.put(question.getId(), alternatives);
            correctAlternativeByQuestionId.put(question.getId(), alternatives.get(1).getId());
            allAlternatives.addAll(alternatives);
        }

        when(examRepository.findByIdAndTeacherId(eq(exam.getId()), eq(teacherId))).thenReturn(Optional.of(exam));
        when(examVersionRepository.existsByExamId(exam.getId())).thenReturn(false);
        when(examQuestionRepository.findAllByExamIdOrderByPositionAsc(exam.getId())).thenReturn(examQuestions);
        when(questionRepository.findAllByIdInAndTeacherId(any(), eq(teacherId))).thenReturn(questions);
        when(alternativeRepository.findAllByQuestionIdOrderByPositionAsc(any())).thenAnswer(invocation -> alternativesByQuestionId.get(invocation.getArgument(0)));
        when(alternativeRepository.findAllById(any())).thenAnswer(invocation -> {
            Iterable<UUID> requestedIds = invocation.getArgument(0);
            List<UUID> ids = new ArrayList<>();
            requestedIds.forEach(ids::add);
            return allAlternatives.stream().filter(alternative -> ids.contains(alternative.getId())).toList();
        });

        return new Fixture(teacherId, exam, questions, correctAlternativeByQuestionId);
    }

    private String letterFor(int position) {
        return String.valueOf((char) ('A' + position - 1));
    }

    private record Fixture(
            UUID teacherId,
            ExamEntity exam,
            List<QuestionEntity> questions,
            Map<UUID, UUID> correctAlternativeByQuestionId) {
    }
}
