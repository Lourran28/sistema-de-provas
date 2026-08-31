package br.com.provas.dtos.auth;

import java.time.Instant;

public record AuthResponse(String accessToken, String tokenType, Instant expiresAt, UserProfileResponse user) {
}
