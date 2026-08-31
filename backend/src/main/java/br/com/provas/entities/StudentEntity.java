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
@Table(name = "students")
public class StudentEntity {

    @Id
    private UUID id;

    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

    @Column(nullable = false, length = 180)
    private String name;

    @Column(length = 80)
    private String identifier;

    @Column(name = "class_group", nullable = false, length = 120)
    private String classGroup;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected StudentEntity() {
    }

    public StudentEntity(UUID teacherId, String name, String identifier, String classGroup) {
        this.id = UUID.randomUUID();
        this.teacherId = teacherId;
        this.name = name;
        this.identifier = identifier;
        this.classGroup = classGroup;
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

    public void update(String name, String identifier, String classGroup) {
        this.name = name;
        this.identifier = identifier;
        this.classGroup = classGroup;
    }

    public UUID getId() {
        return id;
    }

    public UUID getTeacherId() {
        return teacherId;
    }

    public String getName() {
        return name;
    }

    public String getIdentifier() {
        return identifier;
    }

    public String getClassGroup() {
        return classGroup;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
