package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.provas.dtos.corrections.CorrectionAnswerRequest;
import br.com.provas.dtos.corrections.CorrectionRequest;
import br.com.provas.dtos.corrections.CorrectionResponse;
import br.com.provas.entities.AlternativeEntity;
import br.com.provas.entities.AnswerKeyEntity;
import br.com.provas.entities.AnswerKeyItemEntity;
import br.com.provas.entities.ExamEntity;
import br.com.provas.entities.ExamQuestionEntity;
import br.com.provas.entities.ExamVersionAlternativeEntity;
import br.com.provas.entities.ExamVersionEntity;
import br.com.provas.entities.ExamVersionQuestionEntity;
import br.com.provas.entities.StudentAnswerStatus;
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

@ExtendWith(MockitoExtension.class)
class CorrectionServiceTest {

    @Mock
    private CorrectionRepository correctionRepository;

    @Mock
    private StudentAnswerRepository studentAnswerRepository;

    @Mock
    private ExamRepository examRepository;

    @Mock
    private ExamQuestionRepository examQuestionRepository;

    @Mock
    private ExamVersionRepository examVersionRepository;

    @Mock
    private ExamVersionQuestionRepository examVersionQuestionRepository;

    @Mock
    private ExamVersionAlternativeRepository examVersionAlternativeRepository;

    @Mock
    private AlternativeRepository alternativeRepository;

    @Mock
    private AnswerKeyRepository answerKeyRepository;

    @Mock
    private AnswerKeyItemRepository answerKeyItemRepository;

    @Mock
    private StudentService studentService;

    @Mock
    private ExamApplicationService examApplicationService;

    @InjectMocks
    private CorrectionService correctionService;

    @Test
    void calculatesTheDraftUsingTheAnswerKeyOfTheSelectedVersion() {
        Fixture fixture = configureFixture();

        CorrectionResponse response = correctionService.create(fixture.teacherId(), new CorrectionRequest(
                fixture.version().getId(),
                null,
                "Ana Souza",
                null,
                "2º Ano",
                List.of(
                        new CorrectionAnswerRequest(fixture.firstVersionQuestion().getId(), fixture.firstCorrectAlternative().getId(), StudentAnswerStatus.DETECTED),
                        new CorrectionAnswerRequest(fixture.secondVersionQuestion().getId(), null, StudentAnswerStatus.BLANK))));

        assertEquals(new BigDecimal("5.00"), response.score());
        assertEquals(1, response.correctCount());
        assertEquals(0, response.wrongCount());
        assertEquals(1, response.blankCount());
        assertEquals(0, response.ambiguousCount());
        assertEquals("A", response.answers().getFirst().correctLetter());
        assertEquals(Boolean.TRUE, response.answers().getFirst().correct());
        assertEquals(null, response.answers().get(1).correct());
    }

    @Test
    void rejectsAlternativeThatDoesNotBelongToTheVersionQuestion() {
        Fixture fixture = configureFixture();
        AlternativeEntity invalidAlternative = new AlternativeEntity(UUID.randomUUID(), "Alternativa externa", 1, false);

        CorrectionRequest request = new CorrectionRequest(
                fixture.version().getId(),
                null,
                "Ana Souza",
                null,
                "2º Ano",
                List.of(
                        new CorrectionAnswerRequest(fixture.firstVersionQuestion().getId(), invalidAlternative.getId(), StudentAnswerStatus.DETECTED),
                        new CorrectionAnswerRequest(fixture.secondVersionQuestion().getId(), fixture.secondCorrectAlternative().getId(), StudentAnswerStatus.DETECTED)));

        assertThrows(IllegalArgumentException.class, () -> correctionService.create(fixture.teacherId(), request));
    }

    private Fixture configureFixture() {
        UUID teacherId = UUID.randomUUID();
        ExamEntity exam = new ExamEntity(
                teacherId,
                null,
                "Avaliação de Química",
                "2º Ano",
                null,
                null,
                null,
                null,
                new BigDecimal("10.00"),
                2);
        ExamVersionEntity version = new ExamVersionEntity(exam.getId(), "A");

        ExamQuestionEntity firstExamQuestion = new ExamQuestionEntity(exam.getId(), UUID.randomUUID(), 1, new BigDecimal("5.00"));
        ExamQuestionEntity secondExamQuestion = new ExamQuestionEntity(exam.getId(), UUID.randomUUID(), 2, new BigDecimal("5.00"));
        ExamVersionQuestionEntity firstVersionQuestion = new ExamVersionQuestionEntity(version.getId(), firstExamQuestion.getId(), firstExamQuestion.getQuestionId(), 1);
        ExamVersionQuestionEntity secondVersionQuestion = new ExamVersionQuestionEntity(version.getId(), secondExamQuestion.getId(), secondExamQuestion.getQuestionId(), 2);

        AlternativeEntity firstCorrectAlternative = new AlternativeEntity(firstExamQuestion.getQuestionId(), "Correta 1", 1, true);
        AlternativeEntity firstWrongAlternative = new AlternativeEntity(firstExamQuestion.getQuestionId(), "Errada 1", 2, false);
        AlternativeEntity secondCorrectAlternative = new AlternativeEntity(secondExamQuestion.getQuestionId(), "Correta 2", 1, true);
        AlternativeEntity secondWrongAlternative = new AlternativeEntity(secondExamQuestion.getQuestionId(), "Errada 2", 2, false);

        List<ExamVersionAlternativeEntity> links = List.of(
                new ExamVersionAlternativeEntity(firstVersionQuestion.getId(), firstCorrectAlternative.getId(), 1),
                new ExamVersionAlternativeEntity(firstVersionQuestion.getId(), firstWrongAlternative.getId(), 2),
                new ExamVersionAlternativeEntity(secondVersionQuestion.getId(), secondCorrectAlternative.getId(), 1),
                new ExamVersionAlternativeEntity(secondVersionQuestion.getId(), secondWrongAlternative.getId(), 2));
        AnswerKeyEntity answerKey = new AnswerKeyEntity(version.getId());
        List<AnswerKeyItemEntity> answerKeyItems = List.of(
                new AnswerKeyItemEntity(answerKey.getId(), firstVersionQuestion.getId(), firstCorrectAlternative.getId(), 1, "A"),
                new AnswerKeyItemEntity(answerKey.getId(), secondVersionQuestion.getId(), secondCorrectAlternative.getId(), 2, "A"));

        when(examVersionRepository.findById(version.getId())).thenReturn(Optional.of(version));
        when(examRepository.findByIdAndTeacherId(eq(exam.getId()), eq(teacherId))).thenReturn(Optional.of(exam));
        when(examVersionQuestionRepository.findAllByExamVersionIdOrderByPositionAsc(version.getId()))
                .thenReturn(List.of(firstVersionQuestion, secondVersionQuestion));
        when(examVersionAlternativeRepository.findAllByExamVersionQuestionIdInOrderByExamVersionQuestionIdAscPositionAsc(any()))
                .thenReturn(links);
        when(alternativeRepository.findAllById(any())).thenReturn(List.of(
                firstCorrectAlternative,
                firstWrongAlternative,
                secondCorrectAlternative,
                secondWrongAlternative));
        when(answerKeyRepository.findByExamVersionId(version.getId())).thenReturn(Optional.of(answerKey));
        when(answerKeyItemRepository.findAllByAnswerKeyIdOrderByQuestionPositionAsc(answerKey.getId())).thenReturn(answerKeyItems);
        when(examQuestionRepository.findAllByExamIdOrderByPositionAsc(exam.getId())).thenReturn(List.of(firstExamQuestion, secondExamQuestion));

        return new Fixture(
                teacherId,
                version,
                firstVersionQuestion,
                secondVersionQuestion,
                firstCorrectAlternative,
                secondCorrectAlternative);
    }

    private record Fixture(
            UUID teacherId,
            ExamVersionEntity version,
            ExamVersionQuestionEntity firstVersionQuestion,
            ExamVersionQuestionEntity secondVersionQuestion,
            AlternativeEntity firstCorrectAlternative,
            AlternativeEntity secondCorrectAlternative) {
    }
}
