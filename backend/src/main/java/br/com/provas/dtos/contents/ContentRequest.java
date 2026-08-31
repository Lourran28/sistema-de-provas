package br.com.provas.dtos.contents;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContentRequest(
        UUID subjectId,
        @NotBlank(message = "Informe o título do conteúdo.")
        @Size(max = 180, message = "O título deve ter no máximo 180 caracteres.")
        String title,
        @NotBlank(message = "Informe o assunto.")
        @Size(max = 160, message = "O assunto deve ter no máximo 160 caracteres.")
        String topic,
        @Size(max = 160, message = "O tema deve ter no máximo 160 caracteres.")
        String theme,
        @NotBlank(message = "Informe o material de referência.")
        @Size(max = 50000, message = "O material deve ter no máximo 50000 caracteres.")
        String body,
        @Size(max = 10000, message = "As observações devem ter no máximo 10000 caracteres.")
        String notes) {
}
