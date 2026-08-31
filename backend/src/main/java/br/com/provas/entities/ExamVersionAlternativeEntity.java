package br.com.provas.entities;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "exam_version_alternatives")
public class ExamVersionAlternativeEntity {

    @Id
    private UUID id;

    @Column(name = "exam_version_question_id", nullable = false)
    private UUID examVersionQuestionId;

    @Column(name = "alternative_id", nullable = false)
    private UUID alternativeId;

    @Column(nullable = false)
    private int position;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ExamVersionAlternativeEntity() {
    }

    public ExamVersionAlternativeEntity(UUID examVersionQuestionId, UUID alternativeId, int position) {
        this.id = UUID.randomUUID();
        this.examVersionQuestionId = examVersionQuestionId;
        this.alternativeId = alternativeId;
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

    public UUID getExamVersionQuestionId() {
        return examVersionQuestionId;
    }

    public UUID getAlternativeId() {
        return alternativeId;
    }

    public int getPosition() {
        return position;
    }
}
