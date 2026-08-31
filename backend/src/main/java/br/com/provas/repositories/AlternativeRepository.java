package br.com.provas.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.AlternativeEntity;

public interface AlternativeRepository extends JpaRepository<AlternativeEntity, UUID> {

    List<AlternativeEntity> findAllByQuestionIdOrderByPositionAsc(UUID questionId);

    List<AlternativeEntity> findAllByQuestionIdInOrderByQuestionIdAscPositionAsc(List<UUID> questionIds);

    void deleteByQuestionId(UUID questionId);
}
