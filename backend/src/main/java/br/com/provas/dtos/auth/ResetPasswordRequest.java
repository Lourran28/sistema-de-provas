package br.com.provas.dtos.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "O link de redefinição é obrigatório.")
        @Size(max = 128, message = "O link de redefinição é inválido.")
        String token,

        @NotBlank(message = "Informe a nova senha.")
        @Size(min = 8, max = 72, message = "A nova senha deve ter entre 8 e 72 caracteres.")
        String newPassword) {
}
