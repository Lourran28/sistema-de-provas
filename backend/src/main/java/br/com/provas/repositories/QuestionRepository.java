package br.com.provas.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import br.com.provas.entities.QuestionEntity;
import br.com.provas.entities.QuestionStatus;

public interface QuestionRepository extends JpaRepository<QuestionEntity, UUID>, JpaSpecificationExecutor<QuestionEntity> {

    Optional<QuestionEntity> findByIdAndTeacherId(UUID id, UUID teacherId);

    List<QuestionEntity> findAllByIdInAndTeacherId(List<UUID> ids, UUID teacherId);

    List<QuestionEntity> findAllByTeacherIdAndStatus(UUID teacherId, QuestionStatus status);
}
