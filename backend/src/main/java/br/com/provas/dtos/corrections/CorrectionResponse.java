package br.com.provas.dtos.corrections;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import br.com.provas.entities.CorrectionStatus;

public record CorrectionResponse(
        UUID id,
        UUID examVersionId,
        String examTitle,
        String versionLabel,
        UUID studentId,
        String studentName,
        String studentIdentifier,
        String classGroup,
        CorrectionStatus status,
        BigDecimal score,
        BigDecimal totalScore,
        int correctCount,
        int wrongCount,
        int blankCount,
        int ambiguousCount,
        Instant reviewedAt,
        Instant createdAt,
        List<CorrectionAnswerResponse> answers) {
}
