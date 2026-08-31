package br.com.provas.services;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.provas.dtos.contents.ContentPageResponse;
import br.com.provas.dtos.contents.ContentRequest;
import br.com.provas.dtos.contents.ContentResponse;
import br.com.provas.entities.ContentEntity;
import br.com.provas.exceptions.NotFoundException;
import br.com.provas.repositories.ContentRepository;

@Service
public class ContentService {

    private final ContentRepository contentRepository;
    private final SubjectService subjectService;

    public ContentService(ContentRepository contentRepository, SubjectService subjectService) {
        this.contentRepository = contentRepository;
        this.subjectService = subjectService;
    }

    @Transactional(readOnly = true)
    public ContentPageResponse list(UUID teacherId, String search, UUID subjectId, String topic, Pageable pageable) {
        Page<ContentEntity> contents = contentRepository.findPageByTeacherId(
                teacherId,
                normalizeOptional(search),
                subjectId,
                normalizeOptional(topic),
                pageable);
        return ContentPageResponse.from(contents);
    }

    @Transactional(readOnly = true)
    public ContentResponse get(UUID teacherId, UUID contentId) {
        return ContentResponse.from(findEntity(teacherId, contentId));
    }

    @Transactional(readOnly = true)
    public List<String> listTopics(UUID teacherId) {
        return contentRepository.findDistinctTopicsByTeacherId(teacherId);
    }

    @Transactional
    public ContentResponse create(UUID teacherId, ContentRequest request) {
        ContentEntity content = new ContentEntity(
                teacherId,
                resolveSubjectId(teacherId, request.subjectId()),
                normalizeRequired(request.title()),
                normalizeRequired(request.topic()),
                normalizeOptional(request.theme()),
                request.body().trim(),
                normalizeOptional(request.notes()));
        return ContentResponse.from(contentRepository.save(content));
    }

    @Transactional
    public ContentResponse update(UUID teacherId, UUID contentId, ContentRequest request) {
        ContentEntity content = findEntity(teacherId, contentId);
        content.update(
                resolveSubjectId(teacherId, request.subjectId()),
                normalizeRequired(request.title()),
                normalizeRequired(request.topic()),
                normalizeOptional(request.theme()),
                request.body().trim(),
                normalizeOptional(request.notes()));
        return ContentResponse.from(contentRepository.save(content));
    }

    @Transactional
    public void delete(UUID teacherId, UUID contentId) {
        contentRepository.delete(findEntity(teacherId, contentId));
    }

    public ContentEntity findEntity(UUID teacherId, UUID contentId) {
        return contentRepository.findByIdAndTeacherId(contentId, teacherId)
                .orElseThrow(() -> new NotFoundException("Conteúdo não encontrado."));
    }

    private UUID resolveSubjectId(UUID teacherId, UUID subjectId) {
        if (subjectId == null) {
            return null;
        }
        return subjectService.findEntity(teacherId, subjectId).getId();
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
