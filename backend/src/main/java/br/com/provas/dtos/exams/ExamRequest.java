package br.com.provas.dtos.exams;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ExamRequest(
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
        @NotEmpty(message = "Selecione pelo menos uma questão.")
        @Size(max = 100, message = "A prova pode possuir no máximo 100 questões.")
        List<UUID> questionIds) {
}
