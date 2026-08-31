package br.com.provas.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.ExamApplicationStudentEntity;

public interface ExamApplicationStudentRepository extends JpaRepository<ExamApplicationStudentEntity, UUID> {

    List<ExamApplicationStudentEntity> findAllByExamApplicationIdOrderByStudentNameAsc(UUID examApplicationId);

    List<ExamApplicationStudentEntity> findAllByExamApplicationIdIn(List<UUID> examApplicationIds);
}
