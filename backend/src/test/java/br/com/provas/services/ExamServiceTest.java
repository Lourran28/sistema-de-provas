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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.provas.dtos.exams.ExamRequest;
import br.com.provas.dtos.exams.ExamClearResponse;
import br.com.provas.dtos.exams.GenerateExamRequest;
import br.com.provas.dtos.exams.GeneratedExamContentRequest;
import br.com.provas.entities.ContentEntity;
import br.com.provas.entities.ExamEntity;
import br.com.provas.entities.ExamQuestionEntity;
import br.com.provas.entities.QuestionDifficulty;
import br.com.provas.entities.QuestionDistributionMode;
import br.com.provas.entities.QuestionEntity;
import br.com.provas.entities.QuestionType;
import br.com.provas.repositories.ExamQuestionRepository;
import br.com.provas.repositories.ExamContentRepository;
import br.com.provas.repositories.ExamRepository;
import br.com.provas.repositories.ExamVersionRepository;
import br.com.provas.services.generation.GeneratedQuestionDraft;
import br.com.provas.services.generation.QuestionGenerationCommand;
import br.com.provas.services.generation.QuestionGenerationProvider;

@ExtendWith(MockitoExtension.class)
class ExamServiceTest {

    @Mock
    private ExamRepository examRepository;

    @Mock
    private ExamQuestionRepository examQuestionRepository;

    @Mock
    private ExamContentRepository examContentRepository;

    @Mock
    private ExamVersionRepository examVersionRepository;

    @Mock
    private ContentService contentService;

    @Mock
    private SubjectService subjectService;

    @Mock
    private QuestionService questionService;

    @Mock
    private QuestionGenerationProvider questionGenerationProvider;

    @Mock
    private CorrectionService correctionService;

    @InjectMocks
    private ExamService examService;

    @Test
    void rejectsDuplicateQuestionsBeforeCreatingAnExam() {
        UUID repeatedQuestionId = UUID.randomUUID();

        assertThrows(IllegalArgumentException.class, () -> examService.create(
                UUID.randomUUID(),
                request(List.of(repeatedQuestionId, repeatedQuestionId))));

        verify(examRepository, never()).save(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void distributesTheTotalScoreAcrossSelectedQuestions() {
        UUID teacherId = UUID.randomUUID();
        List<UUID> questionIds = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        List<QuestionEntity> questions = questionIds.stream()
                .map(id -> new QuestionEntity(teacherId, null, "Enunciado", QuestionType.MULTIPLE_CHOICE, QuestionDifficulty.MEDIUM))
                .toList();
        when(questionService.findEntities(teacherId, questionIds)).thenReturn(questions);
        when(examRepository.save(any(ExamEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(examContentRepository.findAllByIdExamIdOrderByIdContentIdAsc(any())).thenReturn(List.of());
        when(examQuestionRepository.findAllByExamIdOrderByPositionAsc(any())).thenReturn(List.of());

        examService.create(teacherId, request(questionIds));

        ArgumentCaptor<List<ExamQuestionEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(examQuestionRepository).saveAll(captor.capture());
        List<BigDecimal> points = captor.getValue().stream().map(ExamQuestionEntity::getPoints).toList();
        assertEquals(List.of(new BigDecimal("3.33"), new BigDecimal("3.33"), new BigDecimal("3.34")), points);
        verify(questionService).findEntities(eq(teacherId), eq(questionIds));
    }

    @Test
    void sendsOnlySelectedContentsToTheGenerationProvider() {
        UUID teacherId = UUID.randomUUID();
        ContentEntity selectedContent = new ContentEntity(teacherId, null, "Iluminismo", "História", null, "O movimento valorizou a razão.", null);
        UUID selectedContentId = selectedContent.getId();
        when(contentService.findEntity(teacherId, selectedContentId)).thenReturn(selectedContent);
        when(examRepository.save(any(ExamEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(examContentRepository.findAllByIdExamIdOrderByIdContentIdAsc(any())).thenReturn(List.of());
        when(examQuestionRepository.findAllByExamIdOrderByPositionAsc(any())).thenReturn(List.of());
        when(questionGenerationProvider.generate(any())).thenReturn(List.of(new GeneratedQuestionDraft(
                selectedContentId,
                "Pergunta gerada",
                List.of("Resposta correta", "Distrator"),
                0)));
        when(questionService.createGenerated(any(), any(), any(), any(), any()))
                .thenReturn(new QuestionEntity(teacherId, null, "Pergunta gerada", QuestionType.MULTIPLE_CHOICE, QuestionDifficulty.MEDIUM));

        examService.generate(teacherId, generatedRequest(selectedContentId, 1, QuestionDistributionMode.AUTO));

        ArgumentCaptor<QuestionGenerationCommand> commandCaptor = ArgumentCaptor.forClass(QuestionGenerationCommand.class);
        verify(questionGenerationProvider).generate(commandCaptor.capture());
        assertEquals(List.of(selectedContentId), commandCaptor.getValue().contents().stream().map(content -> content.id()).toList());
    }

    @Test
    void rejectsManualDistributionWhenTheSumDoesNotMatchTheTotal() {
        UUID teacherId = UUID.randomUUID();
        UUID contentId = UUID.randomUUID();
        when(contentService.findEntity(teacherId, contentId))
                .thenReturn(new ContentEntity(teacherId, null, "Conteúdo", "Assunto", null, "Texto de referência.", null));

        assertThrows(IllegalArgumentException.class, () -> examService.generate(
                teacherId,
                generatedRequest(contentId, 2, QuestionDistributionMode.MANUAL)));

        verify(questionGenerationProvider, never()).generate(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void updatesDraftMetadataAndQuestionOrder() {
        UUID teacherId = UUID.randomUUID();
        ExamEntity exam = new ExamEntity(
                teacherId,
                null,
                "Avaliação inicial",
                "2º Ano A",
                "Química",
                null,
                null,
                null,
                new BigDecimal("10.00"),
                2);
        QuestionEntity firstQuestion = new QuestionEntity(teacherId, null, "Primeira questão", QuestionType.MULTIPLE_CHOICE, QuestionDifficulty.MEDIUM);
        QuestionEntity secondQuestion = new QuestionEntity(teacherId, null, "Segunda questão", QuestionType.MULTIPLE_CHOICE, QuestionDifficulty.MEDIUM);
        List<QuestionEntity> orderedQuestions = List.of(secondQuestion, firstQuestion);
        ExamRequest updateRequest = new ExamRequest(
                null,
                "Avaliação revisada",
                "2º Ano B",
                "Ligações químicas",
                "Versão interna para a turma B.",
                "Leia cada questão antes de responder.",
                null,
                new BigDecimal("8.00"),
                orderedQuestions.stream().map(QuestionEntity::getId).toList());

        when(examRepository.findByIdAndTeacherId(exam.getId(), teacherId)).thenReturn(Optional.of(exam));
        when(questionService.findEntities(teacherId, updateRequest.questionIds())).thenReturn(orderedQuestions);
        when(examRepository.save(any(ExamEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(examContentRepository.findAllByIdExamIdOrderByIdContentIdAsc(any())).thenReturn(List.of());
        when(examQuestionRepository.findAllByExamIdOrderByPositionAsc(any())).thenReturn(List.of());

        var updated = examService.updateDraft(teacherId, exam.getId(), updateRequest);

        assertEquals("Avaliação revisada", updated.title());
        assertEquals("2º Ano B", updated.classGroup());
        assertEquals(new BigDecimal("8.00"), updated.totalScore());
        assertEquals(2, updated.questionCount());
        verify(examQuestionRepository).deleteByExamId(exam.getId());
        ArgumentCaptor<List<ExamQuestionEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(examQuestionRepository).saveAll(captor.capture());
        assertEquals(
                orderedQuestions.stream().map(QuestionEntity::getId).toList(),
                captor.getValue().stream().map(ExamQuestionEntity::getQuestionId).toList());
        assertEquals(List.of(1, 2), captor.getValue().stream().map(ExamQuestionEntity::getPosition).toList());
    }

    @Test
    void rejectsDraftEditsAfterApproval() {
        UUID teacherId = UUID.randomUUID();
        ExamEntity exam = new ExamEntity(
                teacherId,
                null,
                "Avaliação aprovada",
                null,
                null,
                null,
                null,
                null,
                new BigDecimal("10.00"),
                1);
        exam.approve();
        when(examRepository.findByIdAndTeacherId(exam.getId(), teacherId)).thenReturn(Optional.of(exam));

        assertThrows(IllegalStateException.class, () -> examService.updateDraft(teacherId, exam.getId(), request(List.of(UUID.randomUUID()))));

        verify(questionService, never()).findEntities(any(), any());
    }

    @Test
    void preventsQuestionCancellationAfterAConfirmedCorrection() {
        UUID teacherId = UUID.randomUUID();
        ExamEntity exam = new ExamEntity(
                teacherId,
                null,
                "Avaliação aplicada",
                "2º Ano A",
                null,
                null,
                null,
                null,
                new BigDecimal("10.00"),
                1);
        exam.approve();
        exam.markVersionsGenerated();
        when(examRepository.findByIdAndTeacherId(exam.getId(), teacherId)).thenReturn(Optional.of(exam));
        when(correctionService.hasConfirmedCorrectionsForExam(teacherId, exam.getId())).thenReturn(true);

        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> examService.toggleQuestionCancellation(teacherId, exam.getId(), UUID.randomUUID()));

        assertEquals("Não é possível anular uma questão depois de confirmar correções desta prova.", exception.getMessage());
        verify(examQuestionRepository, never()).findByExamIdAndQuestionId(any(), any());
        verify(correctionService, never()).recalculateForExam(any(), any());
    }

    @Test
    void clearsDraftExamsAndArchivesExamsWithOfficialVersions() {
        UUID teacherId = UUID.randomUUID();
        ExamEntity draftExam = exam(teacherId, "Rascunho");
        ExamEntity officialExam = exam(teacherId, "Prova aplicada");
        officialExam.approve();
        officialExam.markVersionsGenerated();
        when(examRepository.findAllByTeacherIdAndArchivedFalse(teacherId))
                .thenReturn(List.of(draftExam, officialExam));
        when(examVersionRepository.existsByExamId(draftExam.getId())).thenReturn(false);
        when(examVersionRepository.existsByExamId(officialExam.getId())).thenReturn(true);

        ExamClearResponse response = examService.clear(teacherId);

        assertEquals(1, response.deletedCount());
        assertEquals(1, response.archivedCount());
        verify(examQuestionRepository).deleteByExamId(draftExam.getId());
        verify(examContentRepository).deleteByIdExamId(draftExam.getId());
        verify(examRepository).delete(draftExam);
        verify(examRepository).save(officialExam);
        assertTrue(officialExam.isArchived());
    }

    private ExamEntity exam(UUID teacherId, String title) {
        return new ExamEntity(
                teacherId,
                null,
                title,
                null,
                null,
                null,
                null,
                null,
                new BigDecimal("10.00"),
                1);
    }

    private ExamRequest request(List<UUID> questionIds) {
        return new ExamRequest(
                null,
                "Avaliação de revisão",
                null,
                null,
                null,
                null,
                null,
                new BigDecimal("10.00"),
                questionIds);
    }

    private GenerateExamRequest generatedRequest(UUID contentId, int totalQuestions, QuestionDistributionMode distributionMode) {
        return new GenerateExamRequest(
                null,
                "Prova por conteúdo",
                null,
                null,
                null,
                null,
                null,
                new BigDecimal("10.00"),
                totalQuestions,
                QuestionDifficulty.MEDIUM,
                distributionMode,
                List.of(new GeneratedExamContentRequest(contentId, 1)));
    }
}
