package br.com.provas.entities;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class QuestionContentId implements Serializable {

    @Column(name = "question_id")
    private UUID questionId;

    @Column(name = "content_id")
    private UUID contentId;

    protected QuestionContentId() {
    }

    public QuestionContentId(UUID questionId, UUID contentId) {
        this.questionId = questionId;
        this.contentId = contentId;
    }

    public UUID getQuestionId() {
        return questionId;
    }

    public UUID getContentId() {
        return contentId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof QuestionContentId that)) {
            return false;
        }
        return Objects.equals(questionId, that.questionId) && Objects.equals(contentId, that.contentId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(questionId, contentId);
    }
}
