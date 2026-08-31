package br.com.provas.dtos.corrections;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

import br.com.provas.entities.StudentAnswerStatus;

public record CorrectionAnswerRequest(
        @NotNull(message = "A questão da versão é obrigatória.") UUID examVersionQuestionId,
        UUID selectedAlternativeId,
        @NotNull(message = "O status da resposta é obrigatório.") StudentAnswerStatus status) {
}
