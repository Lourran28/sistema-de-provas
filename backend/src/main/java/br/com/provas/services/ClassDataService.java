package br.com.provas.services;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.provas.dtos.corrections.ClassDataDeleteResponse;
import br.com.provas.entities.CorrectionEntity;
import br.com.provas.entities.ExamApplicationEntity;
import br.com.provas.repositories.CorrectionRepository;
import br.com.provas.repositories.ExamApplicationRepository;
import br.com.provas.repositories.ExamApplicationStudentRepository;
import br.com.provas.repositories.StudentAnswerRepository;

@Service
public class ClassDataService {

    private final CorrectionRepository correctionRepository;
    private final StudentAnswerRepository studentAnswerRepository;
    private final ExamApplicationRepository examApplicationRepository;
    private final ExamApplicationStudentRepository examApplicationStudentRepository;

    public ClassDataService(
            CorrectionRepository correctionRepository,
            StudentAnswerRepository studentAnswerRepository,
            ExamApplicationRepository examApplicationRepository,
            ExamApplicationStudentRepository examApplicationStudentRepository) {
        this.correctionRepository = correctionRepository;
        this.studentAnswerRepository = studentAnswerRepository;
        this.examApplicationRepository = examApplicationRepository;
        this.examApplicationStudentRepository = examApplicationStudentRepository;
    }

    @Transactional
    public ClassDataDeleteResponse delete(UUID teacherId, String classGroup) {
        String normalizedClassGroup = normalizeRequired(classGroup);
        List<CorrectionEntity> corrections = correctionRepository.findAllByTeacherIdOrderByCreatedAtDesc(teacherId).stream()
                .filter(correction -> correction.getClassGroup() != null
                        && correction.getClassGroup().equalsIgnoreCase(normalizedClassGroup))
                .toList();
        List<UUID> correctionIds = corrections.stream().map(CorrectionEntity::getId).toList();
        if (!correctionIds.isEmpty()) {
            studentAnswerRepository.deleteAllByCorrectionIdIn(correctionIds);
            correctionRepository.deleteAll(corrections);
        }

        List<ExamApplicationEntity> applications = examApplicationRepository
                .findAllByTeacherIdAndClassGroupIgnoreCase(teacherId, normalizedClassGroup);
        if (!applications.isEmpty()) {
            List<UUID> applicationIds = applications.stream().map(ExamApplicationEntity::getId).toList();
            examApplicationStudentRepository.deleteAll(
                    examApplicationStudentRepository.findAllByExamApplicationIdIn(applicationIds));
            examApplicationRepository.deleteAll(applications);
        }

        return new ClassDataDeleteResponse(corrections.size(), applications.size());
    }

    private String normalizeRequired(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Informe a turma que deve ser excluída.");
        }
        return value.trim().replaceAll("\\s+", " ");
    }
}
