package br.com.provas.dtos.students;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StudentRequest(
        @NotBlank(message = "Informe o nome do aluno.")
        @Size(max = 180, message = "O nome deve ter no máximo 180 caracteres.")
        String name,
        @Size(max = 80, message = "A identificação deve ter no máximo 80 caracteres.")
        String identifier,
        @NotBlank(message = "Informe a turma do aluno.")
        @Size(max = 120, message = "A turma deve ter no máximo 120 caracteres.")
        String classGroup) {
}
