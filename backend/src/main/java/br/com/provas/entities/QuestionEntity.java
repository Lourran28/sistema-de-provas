package br.com.provas.entities;

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
@Table(name = "questions")
public class QuestionEntity {

    @Id
    private UUID id;

    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

    @Column(name = "subject_id")
    private UUID subjectId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String statement;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 40)
    private QuestionType questionType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuestionDifficulty difficulty;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private QuestionSourceType sourceType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuestionStatus status;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected QuestionEntity() {
    }

    public QuestionEntity(UUID teacherId, UUID subjectId, String statement, QuestionType questionType, QuestionDifficulty difficulty) {
        this(teacherId, subjectId, statement, questionType, difficulty, QuestionSourceType.MANUAL, null);
    }

    public QuestionEntity(
            UUID teacherId,
            UUID subjectId,
            String statement,
            QuestionType questionType,
            QuestionDifficulty difficulty,
            QuestionSourceType sourceType) {
        this(teacherId, subjectId, statement, questionType, difficulty, sourceType, null);
    }

    public QuestionEntity(
            UUID teacherId,
            UUID subjectId,
            String statement,
            QuestionType questionType,
            QuestionDifficulty difficulty,
            QuestionSourceType sourceType,
            String imageUrl) {
        this.id = UUID.randomUUID();
        this.teacherId = teacherId;
        this.subjectId = subjectId;
        this.statement = statement;
        this.questionType = questionType;
        this.difficulty = difficulty;
        this.sourceType = sourceType;
        this.status = QuestionStatus.ACTIVE;
        this.imageUrl = imageUrl;
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

    public void update(UUID subjectId, String statement, QuestionType questionType, QuestionDifficulty difficulty, String imageUrl) {
        this.subjectId = subjectId;
        this.statement = statement;
        this.questionType = questionType;
        this.difficulty = difficulty;
        this.imageUrl = imageUrl;
    }

    public void archive() {
        this.status = QuestionStatus.ARCHIVED;
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

    public String getStatement() {
        return statement;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public QuestionType getQuestionType() {
        return questionType;
    }

    public QuestionDifficulty getDifficulty() {
        return difficulty;
    }

    public QuestionSourceType getSourceType() {
        return sourceType;
    }

    public QuestionStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
