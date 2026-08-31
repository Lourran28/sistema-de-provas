package br.com.provas.entities;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "exam_versions")
public class ExamVersionEntity {

    @Id
    private UUID id;

    @Column(name = "exam_id", nullable = false)
    private UUID examId;

    @Column(nullable = false, length = 10)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExamVersionStatus status;

    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ExamVersionEntity() {
    }

    public ExamVersionEntity(UUID examId, String label) {
        this.id = UUID.randomUUID();
        this.examId = examId;
        this.label = label;
        this.status = ExamVersionStatus.GENERATED;
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

    public UUID getExamId() {
        return examId;
    }

    public String getLabel() {
        return label;
    }

    public ExamVersionStatus getStatus() {
        return status;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }
}
