package br.com.provas.dtos.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "Informe sua senha atual.")
        @Size(max = 72, message = "A senha atual deve ter no máximo 72 caracteres.")
        String currentPassword,

        @NotBlank(message = "Informe a nova senha.")
        @Size(min = 8, max = 72, message = "A nova senha deve ter entre 8 e 72 caracteres.")
        String newPassword) {
}
