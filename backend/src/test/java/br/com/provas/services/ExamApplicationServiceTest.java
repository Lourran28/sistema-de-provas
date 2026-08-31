package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.provas.dtos.applications.ExamApplicationRequest;
import br.com.provas.dtos.applications.ExamApplicationStudentRequest;
import br.com.provas.entities.AttendanceStatus;
import br.com.provas.entities.ExamApplicationEntity;
import br.com.provas.entities.ExamEntity;
import br.com.provas.entities.ExamStatus;
import br.com.provas.entities.ExamVersionEntity;
import br.com.provas.entities.StudentEntity;
import br.com.provas.repositories.ExamApplicationRepository;
import br.com.provas.repositories.ExamApplicationStudentRepository;
import br.com.provas.repositories.ExamRepository;
import br.com.provas.repositories.ExamVersionRepository;

@ExtendWith(MockitoExtension.class)
class ExamApplicationServiceTest {

    @Mock
    private ExamRepository examRepository;

    @Mock
    private ExamVersionRepository examVersionRepository;

    @Mock
    private ExamApplicationRepository examApplicationRepository;

    @Mock
    private ExamApplicationStudentRepository examApplicationStudentRepository;

    @Mock
    private StudentService studentService;

    @InjectMocks
    private ExamApplicationService examApplicationService;

    @Test
    void recordsAssignedVersionsAndMarksTheExamAsApplied() {
        UUID teacherId = UUID.randomUUID();
        ExamEntity exam = officialExam(teacherId);
        ExamVersionEntity version = new ExamVersionEntity(exam.getId(), "A");
        StudentEntity student = new StudentEntity(teacherId, "Ana Souza", "2026001", "2º Ano A");
        ExamApplicationRequest request = request(student.getId(), version.getId());

        when(examRepository.findByIdAndTeacherId(exam.getId(), teacherId)).thenReturn(Optional.of(exam));
        when(examVersionRepository.findAllByExamIdOrderByLabelAsc(exam.getId())).thenReturn(List.of(version));
        when(examApplicationRepository.save(any(ExamApplicationEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(studentService.findEntity(teacherId, student.getId())).thenReturn(student);

        var response = examApplicationService.create(teacherId, exam.getId(), request);

        assertEquals(ExamStatus.APPLIED, exam.getStatus());
        assertEquals("2º Ano A", response.classGroup());
        assertEquals("Ana Souza", response.students().getFirst().studentName());
        assertEquals("A", response.students().getFirst().versionLabel());
        assertEquals(AttendanceStatus.PRESENT, response.students().getFirst().attendance());
        verify(examApplicationStudentRepository).saveAll(any());
        verify(examRepository).save(exam);
    }

    @Test
    void rejectsAStudentVersionThatDoesNotBelongToTheExam() {
        UUID teacherId = UUID.randomUUID();
        ExamEntity exam = officialExam(teacherId);
        StudentEntity student = new StudentEntity(teacherId, "Ana Souza", null, "2º Ano A");
        ExamApplicationRequest request = request(student.getId(), UUID.randomUUID());

        when(examRepository.findByIdAndTeacherId(exam.getId(), teacherId)).thenReturn(Optional.of(exam));
        when(examVersionRepository.findAllByExamIdOrderByLabelAsc(exam.getId())).thenReturn(List.of());

        assertThrows(IllegalStateException.class, () -> examApplicationService.create(teacherId, exam.getId(), request));

        verify(examApplicationRepository, never()).save(any());
        verify(studentService, never()).findEntity(any(), any());
    }

    private ExamEntity officialExam(UUID teacherId) {
        ExamEntity exam = new ExamEntity(
                teacherId,
                null,
                "Avaliação de Química",
                "2º Ano A",
                "Ligações químicas",
                null,
                null,
                LocalDate.of(2026, 8, 30),
                new BigDecimal("10.00"),
                10);
        exam.approve();
        exam.markVersionsGenerated();
        return exam;
    }

    private ExamApplicationRequest request(UUID studentId, UUID versionId) {
        return new ExamApplicationRequest(
                "2º Ano A",
                LocalDate.of(2026, 8, 30),
                "Aplicação no primeiro horário.",
                List.of(new ExamApplicationStudentRequest(studentId, versionId, AttendanceStatus.PRESENT)));
    }
}
