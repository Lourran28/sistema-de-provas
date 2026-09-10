package br.com.provas.controllers;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

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
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

import br.com.provas.dtos.corrections.ClassDataDeleteResponse;
import br.com.provas.dtos.corrections.CorrectionBatchConfirmRequest;
import br.com.provas.dtos.corrections.CorrectionBatchConfirmResponse;
import br.com.provas.dtos.corrections.CorrectionRequest;
import br.com.provas.dtos.corrections.CorrectionResponse;
import br.com.provas.security.UserPrincipal;
import br.com.provas.services.CorrectionService;
import br.com.provas.services.ClassDataService;

@RestController
@RequestMapping("/api/corrections")
public class CorrectionController {

    private final CorrectionService correctionService;
    private final ClassDataService classDataService;

    public CorrectionController(CorrectionService correctionService, ClassDataService classDataService) {
        this.correctionService = correctionService;
        this.classDataService = classDataService;
    }

    @GetMapping
    public List<CorrectionResponse> list(@AuthenticationPrincipal UserPrincipal principal) {
        return correctionService.list(principal.id());
    }

    @GetMapping("/{correctionId}")
    public CorrectionResponse get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID correctionId) {
        return correctionService.get(principal.id(), correctionId);
    }

    @PostMapping
    public ResponseEntity<CorrectionResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CorrectionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(correctionService.create(principal.id(), request));
    }

    @PatchMapping("/{correctionId}")
    public CorrectionResponse update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID correctionId,
            @Valid @RequestBody CorrectionRequest request) {
        return correctionService.update(principal.id(), correctionId, request);
    }

    @PostMapping("/{correctionId}/confirm")
    public CorrectionResponse confirm(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID correctionId) {
        return correctionService.confirm(principal.id(), correctionId);
    }

    @PostMapping("/confirm-batch")
    public CorrectionBatchConfirmResponse confirmBatch(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CorrectionBatchConfirmRequest request) {
        return correctionService.confirmBatch(principal.id(), request);
    }

    @DeleteMapping("/{correctionId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID correctionId) {
        correctionService.delete(principal.id(), correctionId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/class-data")
    public ClassDataDeleteResponse deleteClassData(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam String classGroup) {
        return classDataService.delete(principal.id(), classGroup);
    }
}
