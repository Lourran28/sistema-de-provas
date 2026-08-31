package br.com.provas.dtos.students;

import java.time.Instant;
import java.util.UUID;

import br.com.provas.entities.StudentEntity;

public record StudentResponse(
        UUID id,
        String name,
        String identifier,
        String classGroup,
        Instant createdAt,
        Instant updatedAt) {

    public static StudentResponse from(StudentEntity student) {
        return new StudentResponse(
                student.getId(),
                student.getName(),
                student.getIdentifier(),
                student.getClassGroup(),
                student.getCreatedAt(),
                student.getUpdatedAt());
    }
}
