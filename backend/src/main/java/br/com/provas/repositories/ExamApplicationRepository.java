package br.com.provas.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.ExamApplicationEntity;

public interface ExamApplicationRepository extends JpaRepository<ExamApplicationEntity, UUID> {

    List<ExamApplicationEntity> findAllByExamIdOrderByAppliedOnDescCreatedAtDesc(UUID examId);
}
