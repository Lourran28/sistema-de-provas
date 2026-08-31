package br.com.provas.entities;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "answer_keys")
public class AnswerKeyEntity {

    @Id
    private UUID id;

    @Column(name = "exam_version_id", nullable = false, unique = true)
    private UUID examVersionId;

    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AnswerKeyEntity() {
    }

    public AnswerKeyEntity(UUID examVersionId) {
        this.id = UUID.randomUUID();
        this.examVersionId = examVersionId;
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (generatedAt == null) {
            generatedAt = now;
        }
        if (createdAt == null) {
            createdAt = now;
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getExamVersionId() {
        return examVersionId;
    }
}
