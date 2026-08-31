package br.com.provas.dtos.versions;

import java.util.UUID;

public record AnswerKeyItemResponse(int questionPosition, UUID correctAlternativeId, String correctLetter) {
}
