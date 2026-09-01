package br.com.provas.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.provas.entities.ContentEntity;

public interface ContentRepository extends JpaRepository<ContentEntity, UUID>, JpaSpecificationExecutor<ContentEntity> {

    Optional<ContentEntity> findByIdAndTeacherId(UUID id, UUID teacherId);

    @Query("""
            SELECT DISTINCT content.topic
            FROM ContentEntity content
            WHERE content.teacherId = :teacherId
            ORDER BY content.topic
            """)
    List<String> findDistinctTopicsByTeacherId(@Param("teacherId") UUID teacherId);
}
