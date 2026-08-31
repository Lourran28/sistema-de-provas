package br.com.provas.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.SubjectEntity;

public interface SubjectRepository extends JpaRepository<SubjectEntity, UUID> {

    boolean existsByTeacherIdAndNameIgnoreCase(UUID teacherId, String name);

    boolean existsByTeacherIdAndNameIgnoreCaseAndIdNot(UUID teacherId, String name, UUID id);

    Optional<SubjectEntity> findByIdAndTeacherId(UUID id, UUID teacherId);

    List<SubjectEntity> findAllByTeacherIdOrderByNameAsc(UUID teacherId);
}
