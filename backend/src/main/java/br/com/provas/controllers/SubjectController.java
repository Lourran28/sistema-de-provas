package br.com.provas.controllers;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

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
import org.springframework.web.bind.annotation.RestController;

import br.com.provas.dtos.subjects.SubjectRequest;
import br.com.provas.dtos.subjects.SubjectResponse;
import br.com.provas.security.UserPrincipal;
import br.com.provas.services.SubjectService;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {

    private final SubjectService subjectService;

    public SubjectController(SubjectService subjectService) {
        this.subjectService = subjectService;
    }

    @GetMapping
    public List<SubjectResponse> list(@AuthenticationPrincipal UserPrincipal principal) {
        return subjectService.list(principal.id());
    }

    @PostMapping
    public ResponseEntity<SubjectResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SubjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(subjectService.create(principal.id(), request));
    }

    @PatchMapping("/{subjectId}")
    public SubjectResponse update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID subjectId,
            @Valid @RequestBody SubjectRequest request) {
        return subjectService.update(principal.id(), subjectId, request);
    }

    @DeleteMapping("/{subjectId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID subjectId) {
        subjectService.delete(principal.id(), subjectId);
        return ResponseEntity.noContent().build();
    }
}
