package br.com.provas.dtos.versions;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import br.com.provas.entities.ExamVersionStatus;

public record ExamVersionResponse(
        UUID id,
        UUID examId,
        String examTitle,
        String label,
        ExamVersionStatus status,
        Instant generatedAt,
        List<ExamVersionQuestionResponse> questions,
        List<AnswerKeyItemResponse> answerKey) {
}
