package br.com.provas.dtos.corrections;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import br.com.provas.entities.StudentAnswerStatus;

public record CorrectionAnswerRequest(
        @NotNull(message = "A questão da versão é obrigatória.") UUID examVersionQuestionId,
        UUID selectedAlternativeId,
        @NotNull(message = "O status da resposta é obrigatório.") StudentAnswerStatus status,
        @DecimalMin(value = "0.00", message = "A nota da questão aberta não pode ser negativa.")
        @Digits(integer = 8, fraction = 2, message = "A nota da questão aberta deve possuir no máximo duas casas decimais.")
        BigDecimal awardedPoints) {

    public CorrectionAnswerRequest(
            UUID examVersionQuestionId,
            UUID selectedAlternativeId,
            StudentAnswerStatus status) {
        this(examVersionQuestionId, selectedAlternativeId, status, null);
    }
}
