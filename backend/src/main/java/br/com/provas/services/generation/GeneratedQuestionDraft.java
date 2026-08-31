package br.com.provas.services.generation;

import java.util.List;
import java.util.UUID;

public record GeneratedQuestionDraft(UUID contentId, String statement, List<String> alternatives, int correctAlternativeIndex) {
}
