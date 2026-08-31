package br.com.provas.dtos.exams;

import java.util.List;

public record ExamPageResponse(List<ExamResponse> items, PageInfo page) {

    public record PageInfo(int number, int size, long totalElements, int totalPages) {
    }
}
