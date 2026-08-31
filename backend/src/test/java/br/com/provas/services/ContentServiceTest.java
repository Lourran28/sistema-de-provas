package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.provas.dtos.contents.ContentRequest;
import br.com.provas.entities.SubjectEntity;
import br.com.provas.exceptions.NotFoundException;
import br.com.provas.repositories.ContentRepository;

@ExtendWith(MockitoExtension.class)
class ContentServiceTest {

    @Mock
    private ContentRepository contentRepository;

    @Mock
    private SubjectService subjectService;

    @InjectMocks
    private ContentService contentService;

    @Test
    void doesNotAllowLinkingAnotherTeachersSubject() {
        UUID teacherA = UUID.randomUUID();
        UUID subjectOwnedByTeacherB = UUID.randomUUID();
        ContentRequest request = new ContentRequest(
                subjectOwnedByTeacherB,
                "Iluminismo",
                "História moderna",
                null,
                "Material de referência.",
                null);
        when(subjectService.findEntity(teacherA, subjectOwnedByTeacherB))
                .thenThrow(new NotFoundException("Disciplina não encontrada."));

        assertThrows(NotFoundException.class, () -> contentService.create(teacherA, request));
        verify(contentRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void acceptsSubjectBelongingToAuthenticatedTeacher() {
        UUID teacherA = UUID.randomUUID();
        UUID ownSubjectId = UUID.randomUUID();
        ContentRequest request = new ContentRequest(
                ownSubjectId,
                "Iluminismo",
                "História moderna",
                null,
                "Material de referência.",
                null);
        when(subjectService.findEntity(teacherA, ownSubjectId))
                .thenReturn(new SubjectEntity(teacherA, "História", null));
        when(contentRepository.save(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        contentService.create(teacherA, request);

        verify(contentRepository).save(org.mockito.ArgumentMatchers.any());
    }
}
