package br.com.provas.dtos.contents;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import br.com.provas.entities.ContentEntity;

public record ContentResponse(
        UUID id,
        UUID subjectId,
        String title,
        String topic,
        String theme,
        String body,
        String notes,
        String classGroup,
        LocalDate plannedDate,
        Instant createdAt,
        Instant updatedAt) {

    public static ContentResponse from(ContentEntity content) {
        return new ContentResponse(
                content.getId(),
                content.getSubjectId(),
                content.getTitle(),
                content.getTopic(),
                content.getTheme(),
                content.getBody(),
                content.getNotes(),
                content.getClassGroup(),
                content.getPlannedDate(),
                content.getCreatedAt(),
                content.getUpdatedAt());
    }
}
