package br.com.provas.dtos.exams;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import br.com.provas.entities.QuestionDifficulty;
import br.com.provas.entities.QuestionDistributionMode;

public record GenerateExamRequest(
        UUID subjectId,
        @NotBlank(message = "Informe o título da prova.")
        @Size(max = 180, message = "O título deve ter no máximo 180 caracteres.")
        String title,
        @Size(max = 120, message = "A turma deve ter no máximo 120 caracteres.")
        String classGroup,
        @Size(max = 160, message = "O assunto deve ter no máximo 160 caracteres.")
        String topic,
        @Size(max = 10000, message = "A descrição deve ter no máximo 10000 caracteres.")
        String description,
        @Size(max = 10000, message = "As instruções devem ter no máximo 10000 caracteres.")
        String instructions,
        LocalDate examDate,
        @NotNull(message = "Informe a nota total da prova.")
        @DecimalMin(value = "0.01", message = "A nota total deve ser maior que zero.")
        BigDecimal totalScore,
        @NotNull(message = "Informe a quantidade de questões.")
        @Min(value = 1, message = "Informe ao menos uma questão.")
        @Max(value = 100, message = "A prova pode possuir no máximo 100 questões.")
        Integer totalQuestions,
        @NotNull(message = "Informe a dificuldade.")
        QuestionDifficulty difficulty,
        @NotNull(message = "Informe como as questões serão distribuídas.")
        QuestionDistributionMode distributionMode,
        @NotEmpty(message = "Selecione pelo menos um conteúdo.")
        @Size(max = 20, message = "Selecione no máximo 20 conteúdos por geração.")
        List<@Valid GeneratedExamContentRequest> contents) {
}
