package br.com.provas.dtos.applications;

import java.time.LocalDate;
import java.util.UUID;

import br.com.provas.entities.ExamApplicationEntity;
import br.com.provas.entities.ExamEntity;
import br.com.provas.entities.ExamKind;

public record UpcomingExamApplicationResponse(
        UUID id,
        UUID examId,
        String examTitle,
        ExamKind examKind,
        String classGroup,
        LocalDate appliedOn) {

    public static UpcomingExamApplicationResponse from(ExamApplicationEntity application, ExamEntity exam) {
        return new UpcomingExamApplicationResponse(
                application.getId(),
                application.getExamId(),
                exam.getTitle(),
                exam.getKind(),
                application.getClassGroup(),
                application.getAppliedOn());
    }
}
