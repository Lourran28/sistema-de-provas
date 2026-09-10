package br.com.provas.dtos.questions;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
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
        List<@Valid AlternativeRequest> alternatives,
        Integer correctAlternativeIndex) {
}
