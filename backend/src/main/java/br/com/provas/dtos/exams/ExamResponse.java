package br.com.provas.dtos.exams;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import br.com.provas.entities.ExamEntity;
import br.com.provas.entities.ExamStatus;

public record ExamResponse(
        UUID id,
        UUID subjectId,
        String title,
        String classGroup,
        String topic,
        String description,
        String instructions,
        LocalDate examDate,
        BigDecimal totalScore,
        int questionCount,
        ExamStatus status,
        List<ExamContentResponse> contents,
        List<ExamQuestionResponse> questions,
        Instant createdAt,
        Instant updatedAt) {

    public static ExamResponse from(
            ExamEntity exam,
            List<ExamContentResponse> contents,
            List<ExamQuestionResponse> questions) {
        return new ExamResponse(
                exam.getId(),
                exam.getSubjectId(),
                exam.getTitle(),
                exam.getClassGroup(),
                exam.getTopic(),
                exam.getDescription(),
                exam.getInstructions(),
                exam.getExamDate(),
                exam.getTotalScore(),
                exam.getQuestionCount(),
                exam.getStatus(),
                contents,
                questions,
                exam.getCreatedAt(),
                exam.getUpdatedAt());
    }
}
