package br.com.provas.entities;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "exam_questions")
public class ExamQuestionEntity {

    @Id
    private UUID id;

    @Column(name = "exam_id", nullable = false)
    private UUID examId;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(nullable = false)
    private int position;

    @Column(precision = 10, scale = 2)
    private BigDecimal points;

    @Column(name = "is_cancelled", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean isCancelled;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ExamQuestionEntity() {
    }

    public ExamQuestionEntity(UUID examId, UUID questionId, int position, BigDecimal points) {
        this.id = UUID.randomUUID();
        this.examId = examId;
        this.questionId = questionId;
        this.position = position;
        this.points = points;
        this.isCancelled = false;
    }

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getQuestionId() {
        return questionId;
    }

    public UUID getId() {
        return id;
    }

    public int getPosition() {
        return position;
    }

    public BigDecimal getPoints() {
        return points;
    }

    public boolean isCancelled() {
        return isCancelled;
    }

    public void setCancelled(boolean cancelled) {
        this.isCancelled = cancelled;
    }

    public void toggleCancelled() {
        this.isCancelled = !this.isCancelled;
    }

    public void replaceQuestion(UUID questionId) {
        this.questionId = questionId;
    }
}
