package br.com.provas.services;

import java.util.List;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.provas.dtos.subjects.SubjectRequest;
import br.com.provas.dtos.subjects.SubjectResponse;
import br.com.provas.entities.SubjectEntity;
import br.com.provas.exceptions.ConflictException;
import br.com.provas.exceptions.NotFoundException;
import br.com.provas.repositories.SubjectRepository;

@Service
public class SubjectService {

    private final SubjectRepository subjectRepository;

    public SubjectService(SubjectRepository subjectRepository) {
        this.subjectRepository = subjectRepository;
    }

    @Transactional(readOnly = true)
    public List<SubjectResponse> list(UUID teacherId) {
        return subjectRepository.findAllByTeacherIdOrderByNameAsc(teacherId).stream()
                .map(SubjectResponse::from)
                .toList();
    }

    @Transactional
    public SubjectResponse create(UUID teacherId, SubjectRequest request) {
        String name = normalizeRequired(request.name());
        if (subjectRepository.existsByTeacherIdAndNameIgnoreCase(teacherId, name)) {
            throw duplicateName();
        }

        try {
            SubjectEntity subject = subjectRepository.saveAndFlush(
                    new SubjectEntity(teacherId, name, normalizeOptional(request.description())));
            return SubjectResponse.from(subject);
        } catch (DataIntegrityViolationException exception) {
            throw duplicateName();
        }
    }

    @Transactional
    public SubjectResponse update(UUID teacherId, UUID subjectId, SubjectRequest request) {
        SubjectEntity subject = findEntity(teacherId, subjectId);
        String name = normalizeRequired(request.name());
        if (subjectRepository.existsByTeacherIdAndNameIgnoreCaseAndIdNot(teacherId, name, subjectId)) {
            throw duplicateName();
        }

        subject.update(name, normalizeOptional(request.description()));
        try {
            return SubjectResponse.from(subjectRepository.saveAndFlush(subject));
        } catch (DataIntegrityViolationException exception) {
            throw duplicateName();
        }
    }

    @Transactional
    public void delete(UUID teacherId, UUID subjectId) {
        subjectRepository.delete(findEntity(teacherId, subjectId));
    }

    public SubjectEntity findEntity(UUID teacherId, UUID subjectId) {
        return subjectRepository.findByIdAndTeacherId(subjectId, teacherId)
                .orElseThrow(() -> new NotFoundException("Disciplina não encontrada."));
    }

    private ConflictException duplicateName() {
        return new ConflictException("Já existe uma disciplina com este nome.");
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
