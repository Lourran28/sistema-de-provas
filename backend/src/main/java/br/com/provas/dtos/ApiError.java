package br.com.provas.dtos;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.HttpStatus;

public record ApiError(
        String timestamp,
        int status,
        String error,
        String message,
        Map<String, String> fieldErrors) {

    public static ApiError of(HttpStatus status, String message) {
        return new ApiError(Instant.now().toString(), status.value(), status.getReasonPhrase(), message, Map.of());
    }

    public static ApiError of(HttpStatus status, String message, Map<String, String> fieldErrors) {
        return new ApiError(Instant.now().toString(), status.value(), status.getReasonPhrase(), message, Map.copyOf(fieldErrors));
    }
}
