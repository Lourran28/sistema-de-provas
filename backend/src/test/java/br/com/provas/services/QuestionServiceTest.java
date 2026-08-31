package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.provas.dtos.questions.AlternativeRequest;
import br.com.provas.dtos.questions.QuestionClearResponse;
import br.com.provas.dtos.questions.QuestionRequest;
import br.com.provas.entities.QuestionDifficulty;
import br.com.provas.entities.QuestionEntity;
import br.com.provas.entities.QuestionType;
import br.com.provas.exceptions.NotFoundException;
import br.com.provas.repositories.AlternativeRepository;
import br.com.provas.repositories.ExamQuestionRepository;
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
