package br.com.provas.services.generation;

import java.util.UUID;

public record ContentSource(UUID id, UUID subjectId, String title, String body) {
}
