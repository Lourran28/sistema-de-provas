package br.com.provas.dtos.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "Informe seu nome.")
        @Size(max = 160, message = "O nome deve ter no máximo 160 caracteres.")
        String name,
        @NotBlank(message = "Informe seu e-mail.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 180, message = "O e-mail deve ter no máximo 180 caracteres.")
        String email) {
}
