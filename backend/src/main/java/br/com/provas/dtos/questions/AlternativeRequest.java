package br.com.provas.dtos.questions;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AlternativeRequest(
        @NotBlank(message = "Informe o texto da alternativa.")
        @Size(max = 5000, message = "A alternativa deve ter no máximo 5000 caracteres.")
        String text) {
}
