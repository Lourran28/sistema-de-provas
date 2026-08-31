package br.com.provas.entities;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "student_answers")
public class StudentAnswerEntity {

    @Id
    private UUID id;

    @Column(name = "correction_id", nullable = false)
    private UUID correctionId;

    @Column(name = "exam_version_question_id", nullable = false)
    private UUID examVersionQuestionId;

    @Column(name = "detected_alternative_id")
    private UUID detectedAlternativeId;

    @Column(name = "final_alternative_id")
    private UUID finalAlternativeId;

    @Column(name = "raw_detected_value", length = 80)
    private String rawDetectedValue;

    @Column(precision = 5, scale = 4)
    private BigDecimal confidence;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StudentAnswerStatus status;

    @Column(name = "is_correct")
    private Boolean correct;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected StudentAnswerEntity() {
    }

    public StudentAnswerEntity(
            UUID correctionId,
            UUID examVersionQuestionId,
            UUID selectedAlternativeId,
            String rawDetectedValue,
            StudentAnswerStatus status,
            Boolean correct) {
        this.id = UUID.randomUUID();
        this.correctionId = correctionId;
        this.examVersionQuestionId = examVersionQuestionId;
        this.detectedAlternativeId = selectedAlternativeId;
        this.finalAlternativeId = selectedAlternativeId;
        this.rawDetectedValue = rawDetectedValue;
        this.status = status;
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

    public void markConfirmed() {
        if (status == StudentAnswerStatus.DETECTED || status == StudentAnswerStatus.NEEDS_REVIEW) {
            status = StudentAnswerStatus.CONFIRMED;
        }
    }

    public UUID getCorrectionId() {
        return correctionId;
    }

    public UUID getExamVersionQuestionId() {
        return examVersionQuestionId;
    }

    public UUID getFinalAlternativeId() {
        return finalAlternativeId;
    }

    public String getRawDetectedValue() {
        return rawDetectedValue;
    }

    public StudentAnswerStatus getStatus() {
        return status;
    }

    public void setCorrect(Boolean correct) {
        this.correct = correct;
    }

    public UUID getDetectedAlternativeId() {
        return detectedAlternativeId;
    }

    public Boolean getCorrect() {
        return correct;
    }
}
