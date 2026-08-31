package br.com.provas.dtos.subjects;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubjectRequest(
        @NotBlank(message = "Informe o nome da disciplina.")
        @Size(max = 140, message = "O nome deve ter no máximo 140 caracteres.")
        String name,
        @Size(max = 2000, message = "A descrição deve ter no máximo 2000 caracteres.")
        String description) {
}
