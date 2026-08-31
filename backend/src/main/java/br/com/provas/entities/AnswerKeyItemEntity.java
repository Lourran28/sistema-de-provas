package br.com.provas.entities;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "answer_key_items")
public class AnswerKeyItemEntity {

    @Id
    private UUID id;

    @Column(name = "answer_key_id", nullable = false)
    private UUID answerKeyId;

    @Column(name = "exam_version_question_id", nullable = false)
    private UUID examVersionQuestionId;

    @Column(name = "correct_alternative_id", nullable = false)
    private UUID correctAlternativeId;

    @Column(name = "question_position", nullable = false)
    private int questionPosition;

    @Column(name = "correct_letter", nullable = false, length = 8)
    private String correctLetter;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AnswerKeyItemEntity() {
    }

    public AnswerKeyItemEntity(
            UUID answerKeyId,
            UUID examVersionQuestionId,
            UUID correctAlternativeId,
            int questionPosition,
            String correctLetter) {
        this.id = UUID.randomUUID();
        this.answerKeyId = answerKeyId;
        this.examVersionQuestionId = examVersionQuestionId;
        this.correctAlternativeId = correctAlternativeId;
        this.questionPosition = questionPosition;
        this.correctLetter = correctLetter;
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

    public UUID getExamVersionQuestionId() {
        return examVersionQuestionId;
    }

    public UUID getAnswerKeyId() {
        return answerKeyId;
    }

    public UUID getCorrectAlternativeId() {
        return correctAlternativeId;
    }

    public int getQuestionPosition() {
        return questionPosition;
    }

    public String getCorrectLetter() {
        return correctLetter;
    }
}
