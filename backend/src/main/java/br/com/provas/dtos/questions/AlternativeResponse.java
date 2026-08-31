package br.com.provas.dtos.questions;

import java.util.UUID;

import br.com.provas.entities.AlternativeEntity;

public record AlternativeResponse(UUID id, String text, int position, boolean correct) {

    public static AlternativeResponse from(AlternativeEntity alternative) {
        return new AlternativeResponse(
                alternative.getId(),
                alternative.getText(),
                alternative.getPosition(),
                alternative.isCorrect());
    }
}
