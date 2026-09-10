package br.com.provas.dtos.corrections;

import java.math.BigDecimal;
import java.util.UUID;

import br.com.provas.entities.QuestionType;
import br.com.provas.entities.StudentAnswerStatus;

public record CorrectionAnswerResponse(
        UUID examVersionQuestionId,
        int questionPosition,
        UUID selectedAlternativeId,
        String selectedLetter,
        String correctLetter,
        QuestionType questionType,
        BigDecimal awardedPoints,
        BigDecimal maxPoints,
        StudentAnswerStatus status,
        Boolean correct,
        boolean cancelled) {
}
