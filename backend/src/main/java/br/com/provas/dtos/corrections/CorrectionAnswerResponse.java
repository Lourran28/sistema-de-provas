package br.com.provas.dtos.corrections;

import java.util.UUID;

import br.com.provas.entities.StudentAnswerStatus;

public record CorrectionAnswerResponse(
        UUID examVersionQuestionId,
        int questionPosition,
        UUID selectedAlternativeId,
        String selectedLetter,
        String correctLetter,
        StudentAnswerStatus status,
        Boolean correct,
        boolean cancelled) {
}
