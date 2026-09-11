package br.com.provas.dtos;

import java.time.Instant;

public record HealthResponse(String status, String service, int schemaVersion, Instant timestamp) {
}
