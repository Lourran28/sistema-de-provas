package br.com.provas.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.ExamVersionAlternativeEntity;

public interface ExamVersionAlternativeRepository extends JpaRepository<ExamVersionAlternativeEntity, UUID> {

    List<ExamVersionAlternativeEntity> findAllByExamVersionQuestionIdInOrderByExamVersionQuestionIdAscPositionAsc(List<UUID> examVersionQuestionIds);
}
