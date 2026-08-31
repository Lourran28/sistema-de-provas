package br.com.provas.dtos.contents;

import java.util.List;

import org.springframework.data.domain.Page;

import br.com.provas.entities.ContentEntity;

public record ContentPageResponse(List<ContentResponse> items, PageInfo page) {

    public static ContentPageResponse from(Page<ContentEntity> contents) {
        return new ContentPageResponse(
                contents.map(ContentResponse::from).getContent(),
                new PageInfo(
                        contents.getNumber(),
                        contents.getSize(),
                        contents.getTotalElements(),
                        contents.getTotalPages()));
    }

    public record PageInfo(int number, int size, long totalElements, int totalPages) {
    }
}
