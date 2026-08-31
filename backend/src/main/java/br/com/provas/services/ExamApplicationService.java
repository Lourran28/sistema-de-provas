package br.com.provas.services;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.provas.dtos.applications.ExamApplicationRequest;
import br.com.provas.dtos.applications.ExamApplicationResponse;
import br.com.provas.dtos.applications.ExamApplicationStudentRequest;
import br.com.provas.dtos.applications.ExamApplicationStudentResponse;
import br.com.provas.entities.ExamApplicationEntity;
import br.com.provas.entities.ExamApplicationStudentEntity;
import br.com.provas.entities.ExamEntity;
import br.com.provas.entities.ExamStatus;
import br.com.provas.entities.ExamVersionEntity;
import br.com.provas.entities.StudentEntity;
import br.com.provas.exceptions.NotFoundException;
import br.com.provas.repositories.ExamApplicationRepository;
import br.com.provas.repositories.ExamApplicationStudentRepository;
import br.com.provas.repositories.ExamRepository;
import br.com.provas.repositories.ExamVersionRepository;

@Service
public class ExamApplicationService {

    private final ExamRepository examRepository;
    private final ExamVersionRepository examVersionRepository;
    private final ExamApplicationRepository examApplicationRepository;
    private final ExamApplicationStudentRepository examApplicationStudentRepository;
    private final StudentService studentService;

    public ExamApplicationService(
            ExamRepository examRepository,
            ExamVersionRepository examVersionRepository,
            ExamApplicationRepository examApplicationRepository,
            ExamApplicationStudentRepository examApplicationStudentRepository,
            StudentService studentService) {
        this.examRepository = examRepository;
        this.examVersionRepository = examVersionRepository;
        this.examApplicationRepository = examApplicationRepository;
        this.examApplicationStudentRepository = examApplicationStudentRepository;
        this.studentService = studentService;
    }

    @Transactional(readOnly = true)
    public List<ExamApplicationResponse> list(UUID teacherId, UUID examId) {
        findExam(teacherId, examId);
        return examApplicationRepository.findAllByExamIdOrderByAppliedOnDescCreatedAtDesc(examId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public void validateAssignedVersion(UUID teacherId, UUID studentId, UUID examVersionId) {
        ExamVersionEntity version = examVersionRepository.findById(examVersionId)
                .orElseThrow(() -> new NotFoundException("Versão da prova não encontrada."));
        findExam(teacherId, version.getExamId());
        List<ExamApplicationEntity> applications = examApplicationRepository
                .findAllByExamIdOrderByAppliedOnDescCreatedAtDesc(version.getExamId());
        if (applications.isEmpty()) {
            return;
        }
        List<UUID> applicationIds = applications.stream().map(ExamApplicationEntity::getId).toList();
        Map<UUID, List<ExamApplicationStudentEntity>> studentsByApplicationId = new HashMap<>();
        for (ExamApplicationStudentEntity applicationStudent : examApplicationStudentRepository
                .findAllByExamApplicationIdIn(applicationIds)) {
            studentsByApplicationId
                    .computeIfAbsent(applicationStudent.getExamApplicationId(), ignored -> new java.util.ArrayList<>())
                    .add(applicationStudent);
        }
        for (ExamApplicationEntity application : applications) {
            ExamApplicationStudentEntity assignedStudent = studentsByApplicationId
                    .getOrDefault(application.getId(), List.of())
                    .stream()
                    .filter(item -> studentId.equals(item.getStudentId()))
                    .findFirst()
                    .orElse(null);
            if (assignedStudent != null && !examVersionId.equals(assignedStudent.getExamVersionId())) {
                throw new IllegalArgumentException(
                        "Este aluno recebeu a versão " + assignedStudent.getVersionLabel() + " nesta aplicação. Use o gabarito correspondente.");
            }
            if (assignedStudent != null) {
                return;
            }
        }
    }

    @Transactional
    public ExamApplicationResponse create(UUID teacherId, UUID examId, ExamApplicationRequest request) {
        ExamEntity exam = findExam(teacherId, examId);
        ensureCanApply(exam);
        String classGroup = normalizeRequired(request.classGroup());
        validateDistinctStudents(request.students());

        Map<UUID, ExamVersionEntity> versionsById = versionsById(examId);
        ExamApplicationEntity application = examApplicationRepository.save(new ExamApplicationEntity(
                examId,
                teacherId,
                classGroup,
                request.appliedOn(),
                normalizeOptional(request.notes())));

        List<ExamApplicationStudentEntity> appliedStudents = request.students().stream()
                .map(requestStudent -> createAppliedStudent(teacherId, application, classGroup, versionsById, requestStudent))
                .toList();
        examApplicationStudentRepository.saveAll(appliedStudents);
        exam.markApplied();
        examRepository.save(exam);
        return ExamApplicationResponse.from(
                application,
                appliedStudents.stream().map(ExamApplicationStudentResponse::from).toList());
    }

    private ExamApplicationStudentEntity createAppliedStudent(
            UUID teacherId,
            ExamApplicationEntity application,
            String classGroup,
            Map<UUID, ExamVersionEntity> versionsById,
            ExamApplicationStudentRequest requestStudent) {
        StudentEntity student = studentService.findEntity(teacherId, requestStudent.studentId());
        if (!student.getClassGroup().equalsIgnoreCase(classGroup)) {
            throw new IllegalArgumentException("Todos os alunos precisam pertencer à turma selecionada.");
        }
        ExamVersionEntity version = versionsById.get(requestStudent.examVersionId());
        if (version == null) {
            throw new IllegalArgumentException("A versão informada não pertence a esta prova.");
        }
        return new ExamApplicationStudentEntity(
                application.getId(),
                student.getId(),
                student.getName(),
                student.getIdentifier(),
                version.getId(),
                version.getLabel(),
                requestStudent.attendance());
    }

    private ExamApplicationResponse toResponse(ExamApplicationEntity application) {
        List<ExamApplicationStudentResponse> students = examApplicationStudentRepository
                .findAllByExamApplicationIdOrderByStudentNameAsc(application.getId()).stream()
                .map(ExamApplicationStudentResponse::from)
                .toList();
        return ExamApplicationResponse.from(application, students);
    }

    private Map<UUID, ExamVersionEntity> versionsById(UUID examId) {
        Map<UUID, ExamVersionEntity> result = new HashMap<>();
        for (ExamVersionEntity version : examVersionRepository.findAllByExamIdOrderByLabelAsc(examId)) {
            result.put(version.getId(), version);
        }
        if (result.isEmpty()) {
            throw new IllegalStateException("Gere as versões oficiais antes de registrar a aplicação.");
        }
        return result;
    }

    private void validateDistinctStudents(List<ExamApplicationStudentRequest> students) {
        Set<UUID> studentIds = new HashSet<>();
        for (ExamApplicationStudentRequest student : students) {
            if (!studentIds.add(student.studentId())) {
                throw new IllegalArgumentException("Um aluno não pode aparecer mais de uma vez na mesma aplicação.");
            }
        }
    }

    private void ensureCanApply(ExamEntity exam) {
        if (exam.getStatus() != ExamStatus.VERSIONS_GENERATED && exam.getStatus() != ExamStatus.APPLIED) {
            throw new IllegalStateException("A prova precisa ter versões oficiais antes de ser aplicada.");
        }
    }

    private ExamEntity findExam(UUID teacherId, UUID examId) {
        return examRepository.findByIdAndTeacherId(examId, teacherId)
                .orElseThrow(() -> new NotFoundException("Prova não encontrada."));
    }

    private String normalizeRequired(String value) {
        return value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
