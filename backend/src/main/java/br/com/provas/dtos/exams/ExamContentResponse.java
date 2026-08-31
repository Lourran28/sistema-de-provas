package br.com.provas.dtos.exams;

import java.util.UUID;

import br.com.provas.entities.ExamContentEntity;

public record ExamContentResponse(UUID contentId, int questionTargetCount) {

    public static ExamContentResponse from(ExamContentEntity content) {
        return new ExamContentResponse(content.getId().getContentId(), content.getQuestionTargetCount());
    }
}
