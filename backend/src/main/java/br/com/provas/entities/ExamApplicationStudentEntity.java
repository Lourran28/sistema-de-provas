package br.com.provas.entities;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "exam_application_students")
public class ExamApplicationStudentEntity {

    @Id
    private UUID id;

    @Column(name = "exam_application_id", nullable = false)
    private UUID examApplicationId;

    @Column(name = "student_id")
    private UUID studentId;

    @Column(name = "student_name", nullable = false, length = 180)
    private String studentName;

    @Column(name = "student_identifier", length = 80)
    private String studentIdentifier;

    @Column(name = "exam_version_id", nullable = false)
    private UUID examVersionId;

    @Column(name = "version_label", nullable = false, length = 10)
    private String versionLabel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceStatus attendance;

    protected ExamApplicationStudentEntity() {
    }

    public ExamApplicationStudentEntity(
            UUID examApplicationId,
            UUID studentId,
            String studentName,
            String studentIdentifier,
            UUID examVersionId,
            String versionLabel,
            AttendanceStatus attendance) {
        this.id = UUID.randomUUID();
        this.examApplicationId = examApplicationId;
        this.studentId = studentId;
        this.studentName = studentName;
        this.studentIdentifier = studentIdentifier;
        this.examVersionId = examVersionId;
        this.versionLabel = versionLabel;
        this.attendance = attendance;
    }

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getExamApplicationId() {
        return examApplicationId;
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

    public UUID getExamVersionId() {
        return examVersionId;
    }

    public String getVersionLabel() {
        return versionLabel;
    }

    public AttendanceStatus getAttendance() {
        return attendance;
    }
}
