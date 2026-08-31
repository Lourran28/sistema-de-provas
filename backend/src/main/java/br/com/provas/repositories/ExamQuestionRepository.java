package br.com.provas.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.ExamQuestionEntity;

public interface ExamQuestionRepository extends JpaRepository<ExamQuestionEntity, UUID> {

    List<ExamQuestionEntity> findAllByExamIdOrderByPositionAsc(UUID examId);

    Optional<ExamQuestionEntity> findByExamIdAndQuestionId(UUID examId, UUID questionId);

    boolean existsByQuestionId(UUID questionId);

    void deleteByExamId(UUID examId);
}
