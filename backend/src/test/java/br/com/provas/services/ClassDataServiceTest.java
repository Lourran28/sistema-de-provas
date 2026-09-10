package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.provas.dtos.corrections.ClassDataDeleteResponse;
import br.com.provas.entities.AttendanceStatus;
import br.com.provas.entities.CorrectionEntity;
import br.com.provas.entities.ExamApplicationEntity;
import br.com.provas.entities.ExamApplicationStudentEntity;
import br.com.provas.repositories.CorrectionRepository;
import br.com.provas.repositories.ExamApplicationRepository;
import br.com.provas.repositories.ExamApplicationStudentRepository;
import br.com.provas.repositories.StudentAnswerRepository;

@ExtendWith(MockitoExtension.class)
class ClassDataServiceTest {

    @Mock
    private CorrectionRepository correctionRepository;
    @Mock
    private StudentAnswerRepository studentAnswerRepository;
    @Mock
    private ExamApplicationRepository examApplicationRepository;
    @Mock
    private ExamApplicationStudentRepository examApplicationStudentRepository;

    @InjectMocks
    private ClassDataService classDataService;

    @Test
    void deletesOnlyCorrectionsAndApplicationsFromTheRequestedClass() {
        UUID teacherId = UUID.randomUUID();
        CorrectionEntity requestedClass = new CorrectionEntity(
                teacherId, UUID.randomUUID(), null, "Registro", null, "8º A");
        CorrectionEntity otherClass = new CorrectionEntity(
                teacherId, UUID.randomUUID(), null, "Registro", null, "8º B");
        ExamApplicationEntity application = new ExamApplicationEntity(
                UUID.randomUUID(), teacherId, "8º A", LocalDate.now(), null);
        ExamApplicationStudentEntity applicationStudent = new ExamApplicationStudentEntity(
                application.getId(), null, "Aluno", null, UUID.randomUUID(), "A", AttendanceStatus.PRESENT);

        when(correctionRepository.findAllByTeacherIdOrderByCreatedAtDesc(teacherId))
                .thenReturn(List.of(requestedClass, otherClass));
        when(examApplicationRepository.findAllByTeacherIdAndClassGroupIgnoreCase(teacherId, "8º A"))
                .thenReturn(List.of(application));
        when(examApplicationStudentRepository.findAllByExamApplicationIdIn(List.of(application.getId())))
                .thenReturn(List.of(applicationStudent));

        ClassDataDeleteResponse response = classDataService.delete(teacherId, " 8º A ");

        assertEquals(1, response.deletedCorrections());
        assertEquals(1, response.deletedApplications());
        verify(studentAnswerRepository).deleteAllByCorrectionIdIn(List.of(requestedClass.getId()));
        verify(correctionRepository).deleteAll(List.of(requestedClass));
        verify(examApplicationStudentRepository).deleteAll(List.of(applicationStudent));
        verify(examApplicationRepository).deleteAll(List.of(application));
    }
}
