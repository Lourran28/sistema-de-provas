package br.com.provas.dtos.auth;

import java.util.UUID;

import br.com.provas.entities.UserEntity;

public record UserProfileResponse(UUID id, String name, String email, String role) {

    public static UserProfileResponse from(UserEntity user) {
        return new UserProfileResponse(user.getId(), user.getName(), user.getEmail(), user.getRole().name());
    }
}
