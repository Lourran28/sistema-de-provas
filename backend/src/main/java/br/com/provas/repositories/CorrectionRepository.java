package br.com.provas.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.CorrectionEntity;
import br.com.provas.entities.CorrectionStatus;

public interface CorrectionRepository extends JpaRepository<CorrectionEntity, UUID> {

    List<CorrectionEntity> findAllByTeacherIdOrderByCreatedAtDesc(UUID teacherId);

    List<CorrectionEntity> findAllByTeacherIdAndExamVersionIdAndStatus(
            UUID teacherId,
            UUID examVersionId,
            CorrectionStatus status);

    boolean existsByTeacherIdAndExamVersionIdInAndStatus(
            UUID teacherId,
            List<UUID> examVersionIds,
            CorrectionStatus status);

    Optional<CorrectionEntity> findByIdAndTeacherId(UUID id, UUID teacherId);
}
