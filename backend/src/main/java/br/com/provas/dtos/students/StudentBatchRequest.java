package br.com.provas.dtos.students;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record StudentBatchRequest(
        @NotEmpty(message = "A lista de alunos não pode estar vazia.")
        @Size(max = 500, message = "A importação aceita no máximo 500 alunos por vez.")
        List<@Valid StudentRequest> students) {
}
