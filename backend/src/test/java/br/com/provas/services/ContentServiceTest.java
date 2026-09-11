package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
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
                null,
                "8º A",
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
        LocalDate plannedDate = LocalDate.of(2026, 9, 15);
        ContentRequest request = new ContentRequest(
                ownSubjectId,
                "Iluminismo",
                "História moderna",
                null,
                "Material de referência.",
                null,
                " 8º A ",
                plannedDate);
        when(subjectService.findEntity(teacherA, ownSubjectId))
                .thenReturn(new SubjectEntity(teacherA, "História", null));
        when(contentRepository.save(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = contentService.create(teacherA, request);

        verify(contentRepository).save(org.mockito.ArgumentMatchers.any());
        assertEquals("8º A", response.classGroup());
        assertEquals(plannedDate, response.plannedDate());
    }
}
