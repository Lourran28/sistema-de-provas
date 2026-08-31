package br.com.provas.entities;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "exam_version_questions")
public class ExamVersionQuestionEntity {

    @Id
    private UUID id;

    @Column(name = "exam_version_id", nullable = false)
    private UUID examVersionId;

    @Column(name = "exam_question_id", nullable = false)
    private UUID examQuestionId;

    @Column(name = "original_question_id", nullable = false)
    private UUID originalQuestionId;

    @Column(nullable = false)
    private int position;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ExamVersionQuestionEntity() {
    }

    public ExamVersionQuestionEntity(UUID examVersionId, UUID examQuestionId, UUID originalQuestionId, int position) {
        this.id = UUID.randomUUID();
        this.examVersionId = examVersionId;
        this.examQuestionId = examQuestionId;
        this.originalQuestionId = originalQuestionId;
        this.position = position;
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

    public UUID getId() {
        return id;
    }

    public UUID getExamVersionId() {
        return examVersionId;
    }

    public UUID getExamQuestionId() {
        return examQuestionId;
    }

    public UUID getOriginalQuestionId() {
        return originalQuestionId;
    }

    public int getPosition() {
        return position;
    }
}
