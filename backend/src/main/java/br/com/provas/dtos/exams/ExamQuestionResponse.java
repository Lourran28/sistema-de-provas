package br.com.provas.dtos.exams;

import java.math.BigDecimal;
import java.util.UUID;

import br.com.provas.entities.ExamQuestionEntity;

public record ExamQuestionResponse(UUID questionId, int position, BigDecimal points, boolean isCancelled) {

    public static ExamQuestionResponse from(ExamQuestionEntity question) {
        return new ExamQuestionResponse(question.getQuestionId(), question.getPosition(), question.getPoints(), question.isCancelled());
    }
}
