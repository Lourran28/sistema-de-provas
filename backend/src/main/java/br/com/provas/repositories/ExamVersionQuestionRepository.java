package br.com.provas.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.ExamVersionQuestionEntity;

public interface ExamVersionQuestionRepository extends JpaRepository<ExamVersionQuestionEntity, UUID> {

    List<ExamVersionQuestionEntity> findAllByExamVersionIdOrderByPositionAsc(UUID examVersionId);
}
