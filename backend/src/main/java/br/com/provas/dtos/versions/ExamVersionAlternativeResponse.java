package br.com.provas.dtos.versions;

import java.util.UUID;

public record ExamVersionAlternativeResponse(UUID alternativeId, String text, int position) {
}
