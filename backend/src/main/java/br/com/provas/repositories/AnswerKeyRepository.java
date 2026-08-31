package br.com.provas.repositories;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.AnswerKeyEntity;

public interface AnswerKeyRepository extends JpaRepository<AnswerKeyEntity, UUID> {

    Optional<AnswerKeyEntity> findByExamVersionId(UUID examVersionId);
}
