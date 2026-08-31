package br.com.provas.dtos.subjects;

import java.time.Instant;
import java.util.UUID;

import br.com.provas.entities.SubjectEntity;

public record SubjectResponse(UUID id, String name, String description, Instant createdAt, Instant updatedAt) {

    public static SubjectResponse from(SubjectEntity subject) {
        return new SubjectResponse(
                subject.getId(),
                subject.getName(),
                subject.getDescription(),
                subject.getCreatedAt(),
                subject.getUpdatedAt());
    }
}
