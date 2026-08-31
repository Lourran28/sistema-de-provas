package br.com.provas.entities;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "question_contents")
public class QuestionContentEntity {

    @EmbeddedId
    private QuestionContentId id;

    @Enumerated(EnumType.STRING)
    @Column(name = "origin_type", nullable = false, length = 20)
    private QuestionContentOriginType originType;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected QuestionContentEntity() {
    }

    public QuestionContentEntity(UUID questionId, UUID contentId, QuestionContentOriginType originType) {
        this.id = new QuestionContentId(questionId, contentId);
        this.originType = originType;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public QuestionContentId getId() {
        return id;
    }

    public QuestionContentOriginType getOriginType() {
        return originType;
    }
}
