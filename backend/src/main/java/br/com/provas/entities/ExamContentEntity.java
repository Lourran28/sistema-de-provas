package br.com.provas.entities;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "exam_contents")
public class ExamContentEntity {

    @EmbeddedId
    private ExamContentId id;

    @Column(name = "question_target_count")
    private Integer questionTargetCount;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ExamContentEntity() {
    }

    public ExamContentEntity(UUID examId, UUID contentId, int questionTargetCount) {
        this.id = new ExamContentId(examId, contentId);
        this.questionTargetCount = questionTargetCount;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public ExamContentId getId() {
        return id;
    }

    public Integer getQuestionTargetCount() {
        return questionTargetCount;
    }
}
