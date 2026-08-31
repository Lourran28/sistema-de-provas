package br.com.provas.controllers;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.provas.dtos.contents.ContentPageResponse;
import br.com.provas.dtos.contents.ContentRequest;
import br.com.provas.dtos.contents.ContentResponse;
import br.com.provas.security.UserPrincipal;
import br.com.provas.services.ContentService;

@RestController
@RequestMapping("/api/contents")
public class ContentController {

    private final ContentService contentService;

    public ContentController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping
    public ContentPageResponse list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID subjectId,
            @RequestParam(required = false) String topic,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        int pageSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(Math.max(page, 0), pageSize, Sort.by(Sort.Direction.DESC, "updatedAt"));
        return contentService.list(principal.id(), search, subjectId, topic, pageable);
    }

    @GetMapping("/topics")
    public List<String> listTopics(@AuthenticationPrincipal UserPrincipal principal) {
        return contentService.listTopics(principal.id());
    }

    @GetMapping("/{contentId}")
    public ContentResponse get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID contentId) {
        return contentService.get(principal.id(), contentId);
    }

    @PostMapping
    public ResponseEntity<ContentResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ContentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contentService.create(principal.id(), request));
    }

    @PatchMapping("/{contentId}")
    public ContentResponse update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID contentId,
            @Valid @RequestBody ContentRequest request) {
        return contentService.update(principal.id(), contentId, request);
    }

    @DeleteMapping("/{contentId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID contentId) {
        contentService.delete(principal.id(), contentId);
        return ResponseEntity.noContent().build();
    }
}
