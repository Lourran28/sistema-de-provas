package br.com.provas.dtos.questions;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import br.com.provas.entities.AlternativeEntity;
import br.com.provas.entities.QuestionDifficulty;
import br.com.provas.entities.QuestionEntity;
import br.com.provas.entities.QuestionSourceType;
import br.com.provas.entities.QuestionStatus;
import br.com.provas.entities.QuestionType;

public record QuestionResponse(
        UUID id,
        UUID subjectId,
        List<UUID> contentIds,
        String statement,
        String imageUrl,
        QuestionType questionType,
        QuestionDifficulty difficulty,
        QuestionSourceType sourceType,
        QuestionStatus status,
        List<AlternativeResponse> alternatives,
        Instant createdAt,
        Instant updatedAt) {

    public static QuestionResponse from(
            QuestionEntity question,
            List<UUID> contentIds,
            List<AlternativeEntity> alternatives) {
        return new QuestionResponse(
                question.getId(),
                question.getSubjectId(),
                contentIds,
                question.getStatement(),
                question.getImageUrl(),
                question.getQuestionType(),
                question.getDifficulty(),
                question.getSourceType(),
                question.getStatus(),
                alternatives.stream().map(AlternativeResponse::from).toList(),
                question.getCreatedAt(),
                question.getUpdatedAt());
    }
}
