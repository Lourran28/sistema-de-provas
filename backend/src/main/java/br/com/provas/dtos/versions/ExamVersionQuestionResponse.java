package br.com.provas.dtos.versions;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import br.com.provas.entities.QuestionType;

public record ExamVersionQuestionResponse(
        UUID id,
        UUID originalQuestionId,
        int position,
        BigDecimal points,
        String statement,
        String imageUrl,
        QuestionType questionType,
        int responseLines,
        List<ExamVersionAlternativeResponse> alternatives) {

    public ExamVersionQuestionResponse(
            UUID id,
            UUID originalQuestionId,
            int position,
            BigDecimal points,
            String statement,
            String imageUrl,
            QuestionType questionType,
            List<ExamVersionAlternativeResponse> alternatives) {
        this(id, originalQuestionId, position, points, statement, imageUrl, questionType, 5, alternatives);
    }
}
