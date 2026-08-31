package br.com.provas.dtos.applications;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

import br.com.provas.entities.AttendanceStatus;

public record ExamApplicationStudentRequest(
        @NotNull UUID studentId,
        @NotNull UUID examVersionId,
        @NotNull AttendanceStatus attendance) {
}
