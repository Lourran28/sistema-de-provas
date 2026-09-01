package br.com.provas.entities;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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
@Table(name = "exams")
public class ExamEntity {

    @Id
    private UUID id;

    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

    @Column(name = "subject_id")
    private UUID subjectId;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(name = "class_group", length = 120)
    private String classGroup;

    @Column(length = 160)
    private String topic;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "exam_date")
    private LocalDate examDate;

    @Column(name = "total_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalScore;

    @Column(name = "question_count", nullable = false)
    private int questionCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "exam_kind", nullable = false, length = 20, columnDefinition = "VARCHAR(20) DEFAULT 'PROVA'")
    private ExamKind kind;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ExamStatus status;

    @Column(name = "is_archived", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean archived;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ExamEntity() {
    }

    public ExamEntity(
            UUID teacherId,
            UUID subjectId,
            String title,
            String classGroup,
            String topic,
            String description,
            String instructions,
            LocalDate examDate,
            BigDecimal totalScore,
            int questionCount) {
        this(teacherId, subjectId, title, classGroup, topic, description, instructions, examDate, totalScore, questionCount, ExamKind.PROVA);
    }

    public ExamEntity(
            UUID teacherId,
            UUID subjectId,
            String title,
            String classGroup,
            String topic,
            String description,
            String instructions,
            LocalDate examDate,
            BigDecimal totalScore,
            int questionCount,
            ExamKind kind) {
        this.id = UUID.randomUUID();
        this.teacherId = teacherId;
        this.subjectId = subjectId;
        this.title = title;
        this.classGroup = classGroup;
        this.topic = topic;
        this.description = description;
        this.instructions = instructions;
        this.examDate = examDate;
        this.totalScore = totalScore;
        this.questionCount = questionCount;
        this.kind = kind == null ? ExamKind.PROVA : kind;
        this.status = ExamStatus.DRAFT;
        this.archived = false;
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

    public UUID getTeacherId() {
        return teacherId;
    }

    public UUID getSubjectId() {
        return subjectId;
    }

    public String getTitle() {
        return title;
    }

    public String getClassGroup() {
        return classGroup;
    }

    public String getTopic() {
        return topic;
    }

    public String getDescription() {
        return description;
    }

    public String getInstructions() {
        return instructions;
    }

    public LocalDate getExamDate() {
        return examDate;
    }

    public BigDecimal getTotalScore() {
        return totalScore;
    }

    public int getQuestionCount() {
        return questionCount;
    }

    public ExamKind getKind() {
        return kind;
    }

    public ExamStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public boolean isArchived() {
        return archived;
    }

    public void approve() {
        this.status = ExamStatus.READY;
    }

    public void updateDraft(
            UUID subjectId,
            String title,
            String classGroup,
            String topic,
            String description,
            String instructions,
            LocalDate examDate,
            BigDecimal totalScore,
            int questionCount,
            ExamKind kind) {
        this.subjectId = subjectId;
        this.title = title;
        this.classGroup = classGroup;
        this.topic = topic;
        this.description = description;
        this.instructions = instructions;
        this.examDate = examDate;
        this.totalScore = totalScore;
        this.questionCount = questionCount;
        this.kind = kind == null ? this.kind : kind;
    }

    public void markVersionsGenerated() {
        this.status = ExamStatus.VERSIONS_GENERATED;
    }

    public void markApplied() {
        this.status = ExamStatus.APPLIED;
    }

    public void archive() {
        this.archived = true;
    }
}
