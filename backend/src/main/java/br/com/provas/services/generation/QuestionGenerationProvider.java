package br.com.provas.services.generation;

import java.util.List;

public interface QuestionGenerationProvider {

    List<GeneratedQuestionDraft> generate(QuestionGenerationCommand command);
}
