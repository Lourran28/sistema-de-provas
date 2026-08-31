package br.com.provas.entities;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "alternatives")
public class AlternativeEntity {

    @Id
    private UUID id;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(nullable = false)
    private int position;

    @Column(name = "is_correct", nullable = false)
    private boolean correct;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AlternativeEntity() {
    }

    public AlternativeEntity(UUID questionId, String text, int position, boolean correct) {
        this.id = UUID.randomUUID();
        this.questionId = questionId;
        this.text = text;
        this.position = position;
        this.correct = correct;
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getQuestionId() {
        return questionId;
    }

    public String getText() {
        return text;
    }

    public int getPosition() {
        return position;
    }

    public boolean isCorrect() {
        return correct;
    }
}
