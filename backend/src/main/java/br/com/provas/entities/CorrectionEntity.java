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
@Table(name = "corrections")
public class CorrectionEntity {

    @Id
    private UUID id;

    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

    @Column(name = "exam_version_id", nullable = false)
    private UUID examVersionId;

    @Column(name = "student_id")
    private UUID studentId;

    @Column(name = "student_name", nullable = false, length = 180)
    private String studentName;

    @Column(name = "student_identifier", length = 80)
    private String studentIdentifier;

    @Column(name = "class_group", length = 120)
    private String classGroup;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CorrectionStatus status;

    @Column(precision = 10, scale = 2)
    private BigDecimal score;

    @Column(name = "correct_count", nullable = false)
    private int correctCount;

    @Column(name = "wrong_count", nullable = false)
    private int wrongCount;

    @Column(name = "blank_count", nullable = false)
    private int blankCount;

    @Column(name = "ambiguous_count", nullable = false)
    private int ambiguousCount;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CorrectionEntity() {
    }

    public CorrectionEntity(UUID teacherId, UUID examVersionId, UUID studentId, String studentName, String studentIdentifier, String classGroup) {
        this.id = UUID.randomUUID();
        this.teacherId = teacherId;
        this.examVersionId = examVersionId;
        this.studentId = studentId;
        this.studentName = studentName;
        this.studentIdentifier = studentIdentifier;
        this.classGroup = classGroup;
        this.status = CorrectionStatus.NEEDS_REVIEW;
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

    public void update(UUID studentId, String studentName, String studentIdentifier, String classGroup, Summary summary) {
        this.studentId = studentId;
        this.studentName = studentName;
        this.studentIdentifier = studentIdentifier;
        this.classGroup = classGroup;
        this.score = summary.score();
        this.correctCount = summary.correctCount();
        this.wrongCount = summary.wrongCount();
        this.blankCount = summary.blankCount();
        this.ambiguousCount = summary.ambiguousCount();
    }

    public void confirm() {
        if (status != CorrectionStatus.NEEDS_REVIEW) {
            throw new IllegalStateException("Esta correção não pode mais ser confirmada.");
        }
        this.status = CorrectionStatus.CONFIRMED;
        this.reviewedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getTeacherId() {
        return teacherId;
    }

    public UUID getExamVersionId() {
        return examVersionId;
    }

    public UUID getStudentId() {
        return studentId;
    }

    public String getStudentName() {
        return studentName;
    }

    public String getStudentIdentifier() {
        return studentIdentifier;
    }

    public String getClassGroup() {
        return classGroup;
    }

    public CorrectionStatus getStatus() {
        return status;
    }

    public BigDecimal getScore() {
        return score;
    }

    public int getCorrectCount() {
        return correctCount;
    }

    public int getWrongCount() {
        return wrongCount;
    }

    public int getBlankCount() {
        return blankCount;
    }

    public int getAmbiguousCount() {
        return ambiguousCount;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public record Summary(BigDecimal score, int correctCount, int wrongCount, int blankCount, int ambiguousCount) {
    }
}
