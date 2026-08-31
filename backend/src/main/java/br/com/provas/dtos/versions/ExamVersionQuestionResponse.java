package br.com.provas.dtos.versions;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ExamVersionQuestionResponse(
        UUID id,
        UUID originalQuestionId,
        int position,
        BigDecimal points,
        String statement,
        String imageUrl,
        List<ExamVersionAlternativeResponse> alternatives) {
}
