package br.com.provas.controllers;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.provas.dtos.versions.ExamVersionResponse;
import br.com.provas.security.UserPrincipal;
import br.com.provas.services.ExamVersionService;

@RestController
@RequestMapping("/api/exam-versions")
public class ExamVersionController {

    private final ExamVersionService examVersionService;

    public ExamVersionController(ExamVersionService examVersionService) {
        this.examVersionService = examVersionService;
    }

    @GetMapping
    public List<ExamVersionResponse> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID examId) {
        return examId == null
                ? examVersionService.listAll(principal.id())
                : examVersionService.list(principal.id(), examId);
    }

    @GetMapping("/{versionId}")
    public ExamVersionResponse get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID versionId) {
        return examVersionService.get(principal.id(), versionId);
    }

}
