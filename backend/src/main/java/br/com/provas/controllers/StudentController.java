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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.provas.dtos.students.StudentBatchRequest;
import br.com.provas.dtos.students.StudentBatchResponse;
import br.com.provas.dtos.students.StudentRequest;
import br.com.provas.dtos.students.StudentResponse;
import br.com.provas.security.UserPrincipal;
import br.com.provas.services.StudentService;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentService studentService;

    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping
    public List<StudentResponse> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String classGroup) {
        return studentService.list(principal.id(), search, classGroup);
    }

    @PostMapping
    public ResponseEntity<StudentResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody StudentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(studentService.create(principal.id(), request));
    }

    @PostMapping("/batch")
    public ResponseEntity<StudentBatchResponse> createBatch(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody StudentBatchRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(studentService.createBatch(principal.id(), request.students()));
    }

    @PatchMapping("/{studentId}")
    public StudentResponse update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID studentId,
            @Valid @RequestBody StudentRequest request) {
        return studentService.update(principal.id(), studentId, request);
    }

    @DeleteMapping("/{studentId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID studentId) {
        studentService.delete(principal.id(), studentId);
        return ResponseEntity.noContent().build();
    }
}
