package br.com.provas.dtos.students;

import java.util.List;

public record StudentBatchResponse(
        int createdCount,
        int skippedCount,
        List<String> messages,
        List<StudentResponse> createdStudents) {
}
