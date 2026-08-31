package br.com.provas.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.ExamVersionEntity;

public interface ExamVersionRepository extends JpaRepository<ExamVersionEntity, UUID> {

    boolean existsByExamId(UUID examId);

    List<ExamVersionEntity> findAllByExamIdOrderByLabelAsc(UUID examId);

    List<ExamVersionEntity> findAllByExamIdInOrderByGeneratedAtDesc(List<UUID> examIds);

    Optional<ExamVersionEntity> findById(UUID id);

}
