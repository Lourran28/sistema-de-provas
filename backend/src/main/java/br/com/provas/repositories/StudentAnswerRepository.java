package br.com.provas.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.provas.entities.StudentAnswerEntity;

public interface StudentAnswerRepository extends JpaRepository<StudentAnswerEntity, UUID> {

    List<StudentAnswerEntity> findAllByCorrectionId(UUID correctionId);

    @Modifying
    @Query("delete from StudentAnswerEntity answer where answer.correctionId = :correctionId")
    void deleteByCorrectionId(@Param("correctionId") UUID correctionId);

    void deleteAllByCorrectionIdIn(List<UUID> correctionIds);
}
