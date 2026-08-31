package br.com.provas.services.generation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import br.com.provas.entities.QuestionDifficulty;

class LocalContentQuestionGenerationProviderTest {

    private final LocalContentQuestionGenerationProvider provider = new LocalContentQuestionGenerationProvider();

    @Test
    void createsAMediumLengthContextualStatementFromTheSelectedContent() {
        UUID contentId = UUID.randomUUID();
        ContentSource source = new ContentSource(
                contentId,
                UUID.randomUUID(),
                "Ligações Químicas",
                "Os átomos formam ligações químicas para alcançar maior estabilidade. Na ligação iônica ocorre transferência de elétrons entre os átomos.");

        List<GeneratedQuestionDraft> drafts = provider.generate(new QuestionGenerationCommand(
                List.of(source),
                Map.of(contentId, 2),
                QuestionDifficulty.MEDIUM));
        GeneratedQuestionDraft draft = drafts.getFirst();

        assertTrue(draft.statement().contains("\"Ligações Químicas\""));
        assertTrue(draft.statement().length() >= 140);
        assertNotEquals(draft.statement(), drafts.get(1).statement());
        assertEquals("Os átomos formam ligações químicas para alcançar maior estabilidade.", draft.alternatives().getFirst());
        assertEquals(4, new HashSet<>(draft.alternatives()).size());
        assertNotEquals(draft.alternatives(), drafts.get(1).alternatives());
        assertEquals(0, draft.correctAlternativeIndex());
    }
}
