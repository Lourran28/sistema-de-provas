package br.com.provas.dtos.corrections;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CorrectionBatchConfirmRequest(
        @NotNull(message = "A versão da prova é obrigatória.") UUID examVersionId,
        @NotBlank(message = "A turma é obrigatória.") @Size(max = 120) String classGroup) {
}
