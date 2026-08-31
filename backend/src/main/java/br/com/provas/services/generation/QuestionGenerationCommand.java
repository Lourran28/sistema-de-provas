package br.com.provas.services.generation;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import br.com.provas.entities.QuestionDifficulty;

public record QuestionGenerationCommand(
        List<ContentSource> contents,
        Map<UUID, Integer> questionCountByContent,
        QuestionDifficulty difficulty,
        int statementVariantStart) {

    public QuestionGenerationCommand(
            List<ContentSource> contents,
            Map<UUID, Integer> questionCountByContent,
            QuestionDifficulty difficulty) {
        this(contents, questionCountByContent, difficulty, 0);
    }
}
