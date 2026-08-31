package br.com.provas.entities;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class ExamContentId implements Serializable {

    @Column(name = "exam_id")
    private UUID examId;

    @Column(name = "content_id")
    private UUID contentId;

    protected ExamContentId() {
    }

    public ExamContentId(UUID examId, UUID contentId) {
        this.examId = examId;
        this.contentId = contentId;
    }

    public UUID getExamId() {
        return examId;
    }

    public UUID getContentId() {
        return contentId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof ExamContentId that)) {
            return false;
        }
        return Objects.equals(examId, that.examId) && Objects.equals(contentId, that.contentId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(examId, contentId);
    }
}
