package br.com.provas.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.provas.entities.ContentEntity;

public interface ContentRepository extends JpaRepository<ContentEntity, UUID> {

    @Query("""
            SELECT content
            FROM ContentEntity content
            WHERE content.teacherId = :teacherId
              AND (:search IS NULL
                   OR lower(content.title) LIKE lower(concat('%', :search, '%'))
                   OR lower(content.topic) LIKE lower(concat('%', :search, '%'))
                   OR lower(coalesce(content.theme, '')) LIKE lower(concat('%', :search, '%')))
              AND (:subjectId IS NULL OR content.subjectId = :subjectId)
              AND (:topic IS NULL OR lower(content.topic) = lower(:topic))
            """)
    Page<ContentEntity> findPageByTeacherId(
            @Param("teacherId") UUID teacherId,
            @Param("search") String search,
            @Param("subjectId") UUID subjectId,
            @Param("topic") String topic,
            Pageable pageable);

    Optional<ContentEntity> findByIdAndTeacherId(UUID id, UUID teacherId);

    @Query("""
            SELECT DISTINCT content.topic
            FROM ContentEntity content
            WHERE content.teacherId = :teacherId
            ORDER BY content.topic
            """)
    List<String> findDistinctTopicsByTeacherId(@Param("teacherId") UUID teacherId);
}
