package br.com.provas.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.StudentAnswerEntity;

public interface StudentAnswerRepository extends JpaRepository<StudentAnswerEntity, UUID> {

    List<StudentAnswerEntity> findAllByCorrectionId(UUID correctionId);

    void deleteByCorrectionId(UUID correctionId);
}
