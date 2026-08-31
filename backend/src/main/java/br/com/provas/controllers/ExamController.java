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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.provas.dtos.exams.ExamPageResponse;
import br.com.provas.dtos.exams.ExamClearResponse;
import br.com.provas.dtos.exams.ExamRequest;
import br.com.provas.dtos.exams.ExamResponse;
import br.com.provas.dtos.exams.GenerateExamRequest;
import br.com.provas.dtos.applications.ExamApplicationRequest;
import br.com.provas.dtos.applications.ExamApplicationResponse;
import br.com.provas.dtos.versions.ExamVersionResponse;
import br.com.provas.security.UserPrincipal;
import br.com.provas.services.ExamApplicationService;
import br.com.provas.services.ExamService;
import br.com.provas.services.ExamVersionService;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    private final ExamService examService;
    private final ExamVersionService examVersionService;
    private final ExamApplicationService examApplicationService;

    public ExamController(
            ExamService examService,
            ExamVersionService examVersionService,
            ExamApplicationService examApplicationService) {
        this.examService = examService;
        this.examVersionService = examVersionService;
        this.examApplicationService = examApplicationService;
    }

    @GetMapping
    public ExamPageResponse list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        int pageSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(Math.max(page, 0), pageSize, Sort.by(Sort.Direction.DESC, "updatedAt"));
        return examService.list(principal.id(), pageable);
    }

    @GetMapping("/{examId}")
    public ExamResponse get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID examId) {
        return examService.get(principal.id(), examId);
    }

    @DeleteMapping("/{examId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID examId) {
        examService.delete(principal.id(), examId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ExamClearResponse clear(@AuthenticationPrincipal UserPrincipal principal) {
        return examService.clear(principal.id());
    }

    @PostMapping
    public ResponseEntity<ExamResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ExamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(examService.create(principal.id(), request));
    }

    @PatchMapping("/{examId}")
    public ExamResponse updateDraft(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID examId,
            @Valid @RequestBody ExamRequest request) {
        return examService.updateDraft(principal.id(), examId, request);
    }

    @PostMapping("/generate")
    public ResponseEntity<ExamResponse> generate(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody GenerateExamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(examService.generate(principal.id(), request));
    }

    @PostMapping("/{examId}/approve")
    public ExamResponse approve(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID examId) {
        return examService.approve(principal.id(), examId);
    }

    @PostMapping("/{examId}/questions/{questionId}/regenerate")
    public ExamResponse regenerateQuestion(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID examId,
            @PathVariable UUID questionId) {
        return examService.regenerateQuestion(principal.id(), examId, questionId);
    }

    @PostMapping("/{examId}/questions/{questionId}/toggle-cancellation")
    public ExamResponse toggleQuestionCancellation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID examId,
            @PathVariable UUID questionId) {
        return examService.toggleQuestionCancellation(principal.id(), examId, questionId);
    }

    @PostMapping("/{examId}/versions")
    public ResponseEntity<List<ExamVersionResponse>> generateVersions(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID examId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(examVersionService.generate(principal.id(), examId));
    }

    @GetMapping("/{examId}/applications")
    public List<ExamApplicationResponse> listApplications(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID examId) {
        return examApplicationService.list(principal.id(), examId);
    }

    @PostMapping("/{examId}/applications")
    public ResponseEntity<ExamApplicationResponse> createApplication(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID examId,
            @Valid @RequestBody ExamApplicationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(examApplicationService.create(principal.id(), examId, request));
    }
}
