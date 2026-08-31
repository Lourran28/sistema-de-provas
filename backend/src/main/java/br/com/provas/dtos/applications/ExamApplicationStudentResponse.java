package br.com.provas.dtos.applications;

import java.util.UUID;

import br.com.provas.entities.AttendanceStatus;
import br.com.provas.entities.ExamApplicationStudentEntity;

public record ExamApplicationStudentResponse(
        UUID studentId,
        String studentName,
        String studentIdentifier,
        UUID examVersionId,
        String versionLabel,
        AttendanceStatus attendance) {

    public static ExamApplicationStudentResponse from(ExamApplicationStudentEntity student) {
        return new ExamApplicationStudentResponse(
                student.getStudentId(),
                student.getStudentName(),
                student.getStudentIdentifier(),
                student.getExamVersionId(),
                student.getVersionLabel(),
                student.getAttendance());
    }
}
