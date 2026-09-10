package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.provas.dtos.questions.AlternativeRequest;
import br.com.provas.dtos.questions.QuestionClearResponse;
import br.com.provas.dtos.questions.QuestionRequest;
import br.com.provas.dtos.questions.QuestionResponse;
import br.com.provas.entities.AlternativeEntity;
import br.com.provas.entities.QuestionDifficulty;
import br.com.provas.entities.QuestionEntity;
import br.com.provas.entities.QuestionStatus;
import br.com.provas.entities.QuestionType;
import br.com.provas.exceptions.NotFoundException;
import br.com.provas.repositories.AlternativeRepository;
import br.com.provas.repositories.ExamQuestionRepository;
import br.com.provas.repositories.ExamVersionQuestionRepository;
import br.com.provas.repositories.QuestionContentRepository;
import br.com.provas.repositories.QuestionRepository;

@ExtendWith(MockitoExtension.class)
class QuestionServiceTest {

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private AlternativeRepository alternativeRepository;

    @Mock
    private QuestionContentRepository questionContentRepository;

    @Mock
    private ExamQuestionRepository examQuestionRepository;

    @Mock
    private ExamVersionQuestionRepository examVersionQuestionRepository;

    @Mock
    private SubjectService subjectService;

    @Mock
    private ContentService contentService;

    @InjectMocks
    private QuestionService questionService;

    @Test
    void rejectsCorrectAlternativeOutsideTheProvidedAlternatives() {
        UUID teacherId = UUID.randomUUID();

        assertThrows(IllegalArgumentException.class, () -> questionService.create(
                teacherId,
                request(null, 2)));

        verify(questionRepository, never()).save(any());
    }

    @Test
    void rejectsContentOwnedByAnotherTeacher() {
        UUID teacherId = UUID.randomUUID();
        UUID foreignContentId = UUID.randomUUID();
        when(contentService.findEntity(teacherId, foreignContentId))
                .thenThrow(new NotFoundException("Conteúdo não encontrado."));

        assertThrows(NotFoundException.class, () -> questionService.create(
                teacherId,
                request(foreignContentId, 0)));

        verify(questionRepository, never()).save(any());
    }

    @Test
    void createsDiscursiveQuestionWithoutAlternatives() {
        UUID teacherId = UUID.randomUUID();
        AtomicReference<QuestionEntity> savedQuestion = new AtomicReference<>();
        when(questionRepository.save(any(QuestionEntity.class))).thenAnswer(invocation -> {
            QuestionEntity question = invocation.getArgument(0);
            savedQuestion.set(question);
            return question;
        });
        when(questionRepository.findByIdAndTeacherId(any(UUID.class), any(UUID.class)))
                .thenAnswer(invocation -> Optional.ofNullable(savedQuestion.get()));
        when(alternativeRepository.findAllByQuestionIdOrderByPositionAsc(any(UUID.class))).thenReturn(List.of());
        when(questionContentRepository.findAllByIdQuestionIdIn(any())).thenReturn(List.of());

        QuestionResponse response = questionService.create(teacherId, new QuestionRequest(
                null,
                null,
                "Explique como chegou ao resultado.",
                null,
                QuestionType.DISCURSIVE,
                QuestionDifficulty.MEDIUM,
                List.of(),
                null));

        assertEquals(QuestionType.DISCURSIVE, response.questionType());
        assertEquals(List.of(), response.alternatives());
        verify(alternativeRepository, never()).saveAll(any());
    }

    @Test
    void clearsUnusedQuestionsAndArchivesQuestionsAlreadyInAnExam() {
        UUID teacherId = UUID.randomUUID();
        QuestionEntity unusedQuestion = question(teacherId);
        QuestionEntity usedQuestion = question(teacherId);
        when(questionRepository.findAllByTeacherIdAndStatus(teacherId, br.com.provas.entities.QuestionStatus.ACTIVE))
                .thenReturn(List.of(unusedQuestion, usedQuestion));
        when(examQuestionRepository.existsByQuestionId(unusedQuestion.getId())).thenReturn(false);
        when(examQuestionRepository.existsByQuestionId(usedQuestion.getId())).thenReturn(true);

        QuestionClearResponse response = questionService.clear(teacherId);

        assertEquals(1, response.deletedCount());
        assertEquals(1, response.archivedCount());
        verify(alternativeRepository).deleteByQuestionId(unusedQuestion.getId());
        verify(questionContentRepository).deleteByIdQuestionId(unusedQuestion.getId());
        verify(questionRepository).delete(unusedQuestion);
        verify(questionRepository).save(usedQuestion);
    }

    @Test
    void createsARevisionWhenUpdatingAQuestionAlreadyUsedInAnOfficialVersion() {
        UUID teacherId = UUID.randomUUID();
        QuestionEntity original = question(teacherId);
        AtomicReference<QuestionEntity> revision = new AtomicReference<>();
        AtomicReference<List<AlternativeEntity>> savedAlternatives = new AtomicReference<>(List.of());

        when(questionRepository.findByIdAndTeacherId(any(UUID.class), any(UUID.class)))
                .thenAnswer(invocation -> {
                    UUID requestedId = invocation.getArgument(0);
                    UUID requestedTeacherId = invocation.getArgument(1);
                    if (!teacherId.equals(requestedTeacherId)) {
                        return Optional.empty();
                    }
                    if (original.getId().equals(requestedId)) {
                        return Optional.of(original);
                    }
                    QuestionEntity currentRevision = revision.get();
                    return currentRevision != null && currentRevision.getId().equals(requestedId)
                            ? Optional.of(currentRevision)
                            : Optional.empty();
                });
        when(examVersionQuestionRepository.existsByOriginalQuestionId(original.getId())).thenReturn(true);
        when(questionRepository.save(any(QuestionEntity.class))).thenAnswer(invocation -> {
            QuestionEntity saved = invocation.getArgument(0);
            if (!saved.getId().equals(original.getId())) {
                revision.set(saved);
            }
            return saved;
        });
        when(alternativeRepository.saveAll(any())).thenAnswer(invocation -> {
            List<AlternativeEntity> saved = invocation.getArgument(0);
            savedAlternatives.set(saved);
            return saved;
        });
        when(alternativeRepository.findAllByQuestionIdOrderByPositionAsc(any(UUID.class)))
                .thenAnswer(invocation -> savedAlternatives.get());
        when(questionContentRepository.findAllByIdQuestionIdIn(any())).thenReturn(List.of());

        QuestionResponse response = questionService.update(teacherId, original.getId(), request(null, 1));

        assertEquals(QuestionStatus.ARCHIVED, original.getStatus());
        assertNotEquals(original.getId(), response.id());
        assertEquals(QuestionStatus.ACTIVE, response.status());
        assertEquals(2, response.alternatives().size());
        assertEquals(true, response.alternatives().get(1).correct());
        verify(alternativeRepository, never()).deleteByQuestionId(original.getId());
        verify(questionContentRepository, never()).deleteByIdQuestionId(original.getId());
    }

    private QuestionEntity question(UUID teacherId) {
        return new QuestionEntity(
                teacherId,
                null,
                "Questão de teste",
                QuestionType.MULTIPLE_CHOICE,
                QuestionDifficulty.MEDIUM);
    }

    private QuestionRequest request(UUID contentId, int correctAlternativeIndex) {
        return new QuestionRequest(
                null,
                contentId,
                "Qual alternativa está correta?",
                null,
                QuestionType.MULTIPLE_CHOICE,
                QuestionDifficulty.MEDIUM,
                List.of(new AlternativeRequest("Alternativa A"), new AlternativeRequest("Alternativa B")),
                correctAlternativeIndex);
    }
}
