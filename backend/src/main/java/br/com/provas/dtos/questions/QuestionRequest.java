package br.com.provas.dtos.questions;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
        Integer correctAlternativeIndex,
        @Min(value = 1, message = "A questão aberta deve possuir pelo menos 1 linha para resposta.")
        @Max(value = 30, message = "A questão aberta deve possuir no máximo 30 linhas para resposta.")
        Integer responseLines) {

    public QuestionRequest(
            UUID subjectId,
            UUID contentId,
            String statement,
            String imageUrl,
            QuestionType questionType,
            QuestionDifficulty difficulty,
            List<AlternativeRequest> alternatives,
            Integer correctAlternativeIndex) {
        this(subjectId, contentId, statement, imageUrl, questionType, difficulty, alternatives, correctAlternativeIndex, null);
    }
}
