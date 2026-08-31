package br.com.provas.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.ExamContentEntity;
import br.com.provas.entities.ExamContentId;

public interface ExamContentRepository extends JpaRepository<ExamContentEntity, ExamContentId> {

    List<ExamContentEntity> findAllByIdExamIdOrderByIdContentIdAsc(UUID examId);

    void deleteByIdExamId(UUID examId);
}
