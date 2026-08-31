package br.com.provas.dtos.corrections;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CorrectionRequest(
        @NotNull(message = "A versão da prova é obrigatória.") UUID examVersionId,
        UUID studentId,
        @Size(max = 180) String studentName,
        @Size(max = 80) String studentIdentifier,
        @Size(max = 120) String classGroup,
        @NotEmpty(message = "Informe as respostas da prova.") List<@Valid CorrectionAnswerRequest> answers) {
}
