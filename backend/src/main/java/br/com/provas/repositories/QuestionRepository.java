package br.com.provas.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.provas.entities.QuestionDifficulty;
import br.com.provas.entities.QuestionEntity;
import br.com.provas.entities.QuestionStatus;

public interface QuestionRepository extends JpaRepository<QuestionEntity, UUID> {

    @Query("""
            SELECT question
            FROM QuestionEntity question
            WHERE question.teacherId = :teacherId
              AND (:search IS NULL OR lower(question.statement) LIKE lower(concat('%', :search, '%')))
              AND (:subjectId IS NULL OR question.subjectId = :subjectId)
              AND (:difficulty IS NULL OR question.difficulty = :difficulty)
              AND question.status = :status
            """)
    Page<QuestionEntity> findPageByTeacherId(
            @Param("teacherId") UUID teacherId,
            @Param("search") String search,
            @Param("subjectId") UUID subjectId,
            @Param("difficulty") QuestionDifficulty difficulty,
            @Param("status") QuestionStatus status,
            Pageable pageable);

    Optional<QuestionEntity> findByIdAndTeacherId(UUID id, UUID teacherId);

    List<QuestionEntity> findAllByIdInAndTeacherId(List<UUID> ids, UUID teacherId);

    List<QuestionEntity> findAllByTeacherIdAndStatus(UUID teacherId, QuestionStatus status);
}
