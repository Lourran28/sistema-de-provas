package br.com.provas.dtos.exams;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenameExamRequest(
        @NotBlank(message = "Informe o novo nome da prova.")
        @Size(max = 180, message = "O nome deve ter no máximo 180 caracteres.")
        String title) {
}
