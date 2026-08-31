package br.com.provas.services;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.provas.dtos.students.StudentBatchResponse;
import br.com.provas.dtos.students.StudentRequest;
import br.com.provas.dtos.students.StudentResponse;
import br.com.provas.entities.StudentEntity;
import br.com.provas.exceptions.ConflictException;
import br.com.provas.exceptions.NotFoundException;
import br.com.provas.repositories.StudentRepository;

@Service
public class StudentService {

    private final StudentRepository studentRepository;

    public StudentService(StudentRepository studentRepository) {
        this.studentRepository = studentRepository;
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> list(UUID teacherId, String search, String classGroup) {
        String normalizedSearch = normalizeOptional(search);
        String normalizedClassGroup = normalizeOptional(classGroup);
        return studentRepository.findAllByTeacherIdOrderByClassGroupAscNameAsc(teacherId).stream()
                .filter(student -> normalizedClassGroup == null || student.getClassGroup().equalsIgnoreCase(normalizedClassGroup))
                .filter(student -> matchesSearch(student, normalizedSearch))
                .map(StudentResponse::from)
                .toList();
    }

    @Transactional
    public StudentBatchResponse createBatch(UUID teacherId, List<StudentRequest> requests) {
        int created = 0;
        int skipped = 0;
        List<String> messages = new ArrayList<>();
        List<StudentResponse> createdStudents = new ArrayList<>();
        Set<String> processedIdentifiers = new HashSet<>();

        for (StudentRequest request : requests) {
            String name = normalizeOptional(request.name());
            String classGroup = normalizeOptional(request.classGroup());
            String identifier = normalizeOptional(request.identifier());

            if (name == null || classGroup == null) {
                skipped++;
                messages.add("Aluno ignorado: nome e turma são obrigatórios.");
                continue;
            }

            if (identifier != null) {
                if (processedIdentifiers.contains(identifier.toLowerCase(Locale.ROOT))
                        || studentRepository.existsByTeacherIdAndIdentifier(teacherId, identifier)) {
                    skipped++;
                    messages.add("Aluno ignorado (matrícula duplicada '" + identifier + "'): " + name);
                    continue;
                }
                processedIdentifiers.add(identifier.toLowerCase(Locale.ROOT));
            }

            StudentEntity entity = studentRepository.save(new StudentEntity(
                    teacherId,
                    normalizeRequired(name),
                    identifier,
                    normalizeRequired(classGroup)));
            createdStudents.add(StudentResponse.from(entity));
            created++;
        }

        return new StudentBatchResponse(created, skipped, messages, createdStudents);
    }

    @Transactional
    public StudentResponse create(UUID teacherId, StudentRequest request) {
        String identifier = normalizeOptional(request.identifier());
        ensureIdentifierAvailable(teacherId, identifier, null);
        try {
            return StudentResponse.from(studentRepository.saveAndFlush(new StudentEntity(
                    teacherId,
                    normalizeRequired(request.name()),
                    identifier,
                    normalizeRequired(request.classGroup()))));
        } catch (DataIntegrityViolationException exception) {
            throw duplicateIdentifier();
        }
    }

    @Transactional
    public StudentResponse update(UUID teacherId, UUID studentId, StudentRequest request) {
        StudentEntity student = findEntity(teacherId, studentId);
        String identifier = normalizeOptional(request.identifier());
        ensureIdentifierAvailable(teacherId, identifier, studentId);
        student.update(
                normalizeRequired(request.name()),
                identifier,
                normalizeRequired(request.classGroup()));
        try {
            return StudentResponse.from(studentRepository.saveAndFlush(student));
        } catch (DataIntegrityViolationException exception) {
            throw duplicateIdentifier();
        }
    }

    @Transactional
    public void delete(UUID teacherId, UUID studentId) {
        studentRepository.delete(findEntity(teacherId, studentId));
    }

    public StudentEntity findEntity(UUID teacherId, UUID studentId) {
        return studentRepository.findByIdAndTeacherId(studentId, teacherId)
                .orElseThrow(() -> new NotFoundException("Aluno não encontrado."));
    }

    private void ensureIdentifierAvailable(UUID teacherId, String identifier, UUID excludedStudentId) {
        if (identifier == null) {
            return;
        }
        boolean exists = excludedStudentId == null
                ? studentRepository.existsByTeacherIdAndIdentifier(teacherId, identifier)
                : studentRepository.existsByTeacherIdAndIdentifierAndIdNot(teacherId, identifier, excludedStudentId);
        if (exists) {
            throw duplicateIdentifier();
        }
    }

    private boolean matchesSearch(StudentEntity student, String search) {
        if (search == null) {
            return true;
        }
        String haystack = (student.getName() + " " + student.getClassGroup() + " " + (student.getIdentifier() == null ? "" : student.getIdentifier()))
                .toLowerCase(Locale.ROOT);
        return haystack.contains(search.toLowerCase(Locale.ROOT));
    }

    private ConflictException duplicateIdentifier() {
        return new ConflictException("Já existe um aluno com esta identificação.");
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
