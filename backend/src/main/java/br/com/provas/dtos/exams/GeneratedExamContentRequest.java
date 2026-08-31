package br.com.provas.dtos.exams;

import java.util.UUID;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record GeneratedExamContentRequest(
        @NotNull(message = "Selecione um conteúdo.")
        UUID contentId,
        @Min(value = 1, message = "Informe ao menos uma questão por conteúdo.")
        Integer questionCount) {
}
