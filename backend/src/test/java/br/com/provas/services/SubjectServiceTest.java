package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.provas.exceptions.NotFoundException;
import br.com.provas.repositories.SubjectRepository;

@ExtendWith(MockitoExtension.class)
class SubjectServiceTest {

    @Mock
    private SubjectRepository subjectRepository;

    @InjectMocks
    private SubjectService subjectService;

    @Test
    void doesNotExposeAnotherTeachersSubject() {
        UUID teacherA = UUID.randomUUID();
        UUID subjectOwnedByTeacherB = UUID.randomUUID();
        when(subjectRepository.findByIdAndTeacherId(subjectOwnedByTeacherB, teacherA)).thenReturn(java.util.Optional.empty());

        assertThrows(NotFoundException.class, () -> subjectService.findEntity(teacherA, subjectOwnedByTeacherB));
    }
}
