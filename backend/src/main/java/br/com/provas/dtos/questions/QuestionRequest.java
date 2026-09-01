package br.com.provas.dtos.questions;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import br.com.provas.entities.QuestionDifficulty;
import br.com.provas.entities.QuestionType;

public record QuestionRequest(
        UUID subjectId,
        UUID contentId,
        @NotBlank(message = "Informe o enunciado da questão.")
        @Size(max = 20000, message = "O enunciado deve ter no máximo 20000 caracteres.")
        String statement,
        @Size(max = 600000, message = "A imagem deve ter no máximo 450 KB.")
        String imageUrl,
        @NotNull(message = "Informe o tipo da questão.")
        QuestionType questionType,
        @NotNull(message = "Informe a dificuldade.")
        QuestionDifficulty difficulty,
        @NotNull(message = "Informe as alternativas.")
        @Size(min = 2, max = 8, message = "A questão deve possuir entre 2 e 8 alternativas.")
        List<@Valid AlternativeRequest> alternatives,
        @NotNull(message = "Selecione a alternativa correta.")
        @Min(value = 0, message = "Selecione a alternativa correta.")
        @Max(value = 7, message = "Selecione a alternativa correta.")
        Integer correctAlternativeIndex) {
}
