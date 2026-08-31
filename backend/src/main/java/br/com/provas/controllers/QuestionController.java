package br.com.provas.controllers;

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

import br.com.provas.dtos.questions.QuestionPageResponse;
import br.com.provas.dtos.questions.QuestionClearResponse;
import br.com.provas.dtos.questions.QuestionRequest;
import br.com.provas.dtos.questions.QuestionResponse;
import br.com.provas.entities.QuestionDifficulty;
import br.com.provas.security.UserPrincipal;
import br.com.provas.services.QuestionService;

@RestController
@RequestMapping("/api/questions")
public class QuestionController {

    private final QuestionService questionService;

    public QuestionController(QuestionService questionService) {
        this.questionService = questionService;
    }

    @GetMapping
    public QuestionPageResponse list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID subjectId,
            @RequestParam(required = false) QuestionDifficulty difficulty,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        int pageSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(Math.max(page, 0), pageSize, Sort.by(Sort.Direction.DESC, "updatedAt"));
        return questionService.list(principal.id(), search, subjectId, difficulty, pageable);
    }

    @GetMapping("/{questionId}")
    public QuestionResponse get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID questionId) {
        return questionService.get(principal.id(), questionId);
    }

    @PostMapping
    public ResponseEntity<QuestionResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody QuestionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(questionService.create(principal.id(), request));
    }

    @PatchMapping("/{questionId}")
    public QuestionResponse update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID questionId,
            @Valid @RequestBody QuestionRequest request) {
        return questionService.update(principal.id(), questionId, request);
    }

    @DeleteMapping("/{questionId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID questionId) {
        questionService.delete(principal.id(), questionId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public QuestionClearResponse clear(@AuthenticationPrincipal UserPrincipal principal) {
        return questionService.clear(principal.id());
    }
}
