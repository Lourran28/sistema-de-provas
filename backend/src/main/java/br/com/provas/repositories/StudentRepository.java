package br.com.provas.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.StudentEntity;

public interface StudentRepository extends JpaRepository<StudentEntity, UUID> {

    boolean existsByTeacherIdAndIdentifier(UUID teacherId, String identifier);

    boolean existsByTeacherIdAndIdentifierAndIdNot(UUID teacherId, String identifier, UUID id);

    Optional<StudentEntity> findByIdAndTeacherId(UUID id, UUID teacherId);

    List<StudentEntity> findAllByTeacherIdOrderByClassGroupAscNameAsc(UUID teacherId);
}
