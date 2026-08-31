package br.com.provas.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.QuestionContentEntity;
import br.com.provas.entities.QuestionContentId;

public interface QuestionContentRepository extends JpaRepository<QuestionContentEntity, QuestionContentId> {

    List<QuestionContentEntity> findAllByIdQuestionIdIn(List<UUID> questionIds);

    void deleteByIdQuestionId(UUID questionId);
}
