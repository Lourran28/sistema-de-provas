package br.com.provas.dtos.questions;

import java.util.List;

public record QuestionPageResponse(List<QuestionResponse> items, PageInfo page) {

    public record PageInfo(int number, int size, long totalElements, int totalPages) {
    }
}
