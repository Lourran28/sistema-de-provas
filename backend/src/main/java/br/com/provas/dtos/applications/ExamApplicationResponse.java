package br.com.provas.dtos.applications;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import br.com.provas.entities.ExamApplicationEntity;

public record ExamApplicationResponse(
        UUID id,
        UUID examId,
        String classGroup,
        LocalDate appliedOn,
        String notes,
        Instant createdAt,
        List<ExamApplicationStudentResponse> students) {

    public static ExamApplicationResponse from(ExamApplicationEntity application, List<ExamApplicationStudentResponse> students) {
        return new ExamApplicationResponse(
                application.getId(),
                application.getExamId(),
                application.getClassGroup(),
                application.getAppliedOn(),
                application.getNotes(),
                application.getCreatedAt(),
                students);
    }
}
