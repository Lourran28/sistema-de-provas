package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.provas.dtos.students.StudentRequest;
import br.com.provas.entities.StudentEntity;
import br.com.provas.exceptions.ConflictException;
import br.com.provas.repositories.StudentRepository;

@ExtendWith(MockitoExtension.class)
class StudentServiceTest {

    @Mock
    private StudentRepository studentRepository;

    @InjectMocks
    private StudentService studentService;

    @Test
    void createsStudentWithNormalizedData() {
        UUID teacherId = UUID.randomUUID();
        StudentRequest request = new StudentRequest("  Marina   Alves ", " 2026001 ", " 2º Ano A ");
        when(studentRepository.existsByTeacherIdAndIdentifier(teacherId, "2026001")).thenReturn(false);
        when(studentRepository.saveAndFlush(any(StudentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var student = studentService.create(teacherId, request);

        assertEquals("Marina Alves", student.name());
        assertEquals("2026001", student.identifier());
        assertEquals("2º Ano A", student.classGroup());
    }

    @Test
    void rejectsRepeatedStudentIdentifierForTheSameTeacher() {
        UUID teacherId = UUID.randomUUID();
        when(studentRepository.existsByTeacherIdAndIdentifier(eq(teacherId), eq("2026001"))).thenReturn(true);

        assertThrows(ConflictException.class, () -> studentService.create(
                teacherId,
                new StudentRequest("Marina Alves", "2026001", "2º Ano A")));
    }

    @Test
    void createsBatchOfStudentsAndSkipsDuplicates() {
        UUID teacherId = UUID.randomUUID();
        when(studentRepository.existsByTeacherIdAndIdentifier(eq(teacherId), eq("2026001"))).thenReturn(false);
        when(studentRepository.existsByTeacherIdAndIdentifier(eq(teacherId), eq("2026002"))).thenReturn(true);
        when(studentRepository.save(any(StudentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = studentService.createBatch(
                teacherId,
                java.util.List.of(
                        new StudentRequest("Carlos Silva", "2026001", "3º Ano B"),
                        new StudentRequest("Ana Maria", "2026002", "3º Ano B"),
                        new StudentRequest("Bruno Costa", "2026001", "3º Ano B")));

        assertEquals(1, result.createdCount());
        assertEquals(2, result.skippedCount());
        assertEquals(1, result.createdStudents().size());
        assertEquals("Carlos Silva", result.createdStudents().get(0).name());
    }
}
