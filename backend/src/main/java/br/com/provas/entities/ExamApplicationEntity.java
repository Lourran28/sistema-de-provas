package br.com.provas.entities;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "exam_applications")
public class ExamApplicationEntity {

    @Id
    private UUID id;

    @Column(name = "exam_id", nullable = false)
    private UUID examId;

    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

    @Column(name = "class_group", nullable = false, length = 120)
    private String classGroup;

    @Column(name = "applied_on", nullable = false)
    private LocalDate appliedOn;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ExamApplicationEntity() {
    }

    public ExamApplicationEntity(UUID examId, UUID teacherId, String classGroup, LocalDate appliedOn, String notes) {
        this.id = UUID.randomUUID();
        this.examId = examId;
        this.teacherId = teacherId;
        this.classGroup = classGroup;
        this.appliedOn = appliedOn;
        this.notes = notes;
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

    public UUID getExamId() {
        return examId;
    }

    public UUID getTeacherId() {
        return teacherId;
    }

    public String getClassGroup() {
        return classGroup;
    }

    public LocalDate getAppliedOn() {
        return appliedOn;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
