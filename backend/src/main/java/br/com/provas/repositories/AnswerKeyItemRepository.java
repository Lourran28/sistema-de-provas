package br.com.provas.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.AnswerKeyItemEntity;

public interface AnswerKeyItemRepository extends JpaRepository<AnswerKeyItemEntity, UUID> {

    List<AnswerKeyItemEntity> findAllByAnswerKeyIdOrderByQuestionPositionAsc(UUID answerKeyId);
}
