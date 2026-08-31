package br.com.provas.entities;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "contents")
public class ContentEntity {

    @Id
    private UUID id;

    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

    @Column(name = "subject_id")
    private UUID subjectId;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false, length = 160)
    private String topic;

    @Column(length = 160)
    private String theme;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ContentEntity() {
    }

    public ContentEntity(
            UUID teacherId,
            UUID subjectId,
            String title,
            String topic,
            String theme,
            String body,
            String notes) {
        this.id = UUID.randomUUID();
        this.teacherId = teacherId;
        this.subjectId = subjectId;
        this.title = title;
        this.topic = topic;
        this.theme = theme;
        this.body = body;
        this.notes = notes;
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

    public void update(UUID subjectId, String title, String topic, String theme, String body, String notes) {
        this.subjectId = subjectId;
        this.title = title;
        this.topic = topic;
        this.theme = theme;
        this.body = body;
        this.notes = notes;
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

    public String getTopic() {
        return topic;
    }

    public String getTheme() {
        return theme;
    }

    public String getBody() {
        return body;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
