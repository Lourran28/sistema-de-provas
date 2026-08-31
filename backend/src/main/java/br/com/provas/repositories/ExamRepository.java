package br.com.provas.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.ExamEntity;

public interface ExamRepository extends JpaRepository<ExamEntity, UUID> {

    Page<ExamEntity> findAllByTeacherIdAndArchivedFalse(UUID teacherId, Pageable pageable);

    List<ExamEntity> findAllByTeacherIdAndArchivedFalse(UUID teacherId);

    List<ExamEntity> findAllByTeacherIdAndArchivedFalseOrderByUpdatedAtDesc(UUID teacherId);

    Optional<ExamEntity> findByIdAndTeacherId(UUID id, UUID teacherId);
}
