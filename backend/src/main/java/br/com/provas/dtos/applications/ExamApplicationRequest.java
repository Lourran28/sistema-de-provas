package br.com.provas.dtos.applications;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ExamApplicationRequest(
        @NotBlank @Size(max = 120) String classGroup,
        @NotNull LocalDate appliedOn,
        @Size(max = 2_000) String notes,
        @NotEmpty List<@Valid ExamApplicationStudentRequest> students) {
}
