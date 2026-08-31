package br.com.provas.services.generation;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class LocalContentQuestionGenerationProvider implements QuestionGenerationProvider {

    private static final List<String> STATEMENT_TEMPLATES = List.of(
            "Em uma revisão de \"%s\", a turma discutiu os conceitos e exemplos apresentados no material de referência. Considerando essa leitura, assinale a alternativa que está de acordo com o conteúdo estudado.",
            "Ao preparar uma atividade sobre \"%s\", um grupo organizou as informações mais importantes do material. Qual alternativa apresenta corretamente uma das ideias trabalhadas?",
            "Durante a correção de exercícios de \"%s\", o professor retomou as relações explicadas no conteúdo selecionado. Marque a afirmação compatível com esse estudo.",
            "Em uma situação de aprendizagem sobre \"%s\", é importante relacionar os conceitos ao que foi apresentado no material. Assinale a alternativa que expressa uma informação correta.",
            "Uma estudante revisou o conteúdo de \"%s\" antes da avaliação e destacou seus pontos principais. Com base nessa revisão, escolha a alternativa adequada.",
            "Para resolver uma questão sobre \"%s\", a turma deve observar com atenção as informações do material de referência. Qual opção confirma uma ideia estudada?",
            "Em uma discussão sobre \"%s\", foram analisadas explicações e relações fundamentais para compreender o tema. Assinale a alternativa coerente com essa discussão.",
            "Na elaboração de um resumo de \"%s\", os alunos selecionaram somente informações sustentadas pelo material. Identifique a alternativa que poderia fazer parte desse resumo.",
            "Antes de responder a uma atividade de \"%s\", a turma releu os conceitos apresentados no conteúdo selecionado. Marque a afirmação que corresponde a essa leitura.",
            "Depois da leitura sobre \"%s\", os alunos precisaram distinguir informações corretas de conclusões sem apoio no material. Assinale a alternativa que está correta.");

    @Override
    public List<GeneratedQuestionDraft> generate(QuestionGenerationCommand command) {
        List<GeneratedQuestionDraft> drafts = new ArrayList<>();
        for (ContentSource content : command.contents()) {
            int targetCount = command.questionCountByContent().getOrDefault(content.id(), 0);
            List<String> excerpts = extractExcerpts(content.body(), content.title());
            for (int index = 0; index < targetCount; index++) {
                String excerpt = excerpts.get(index % excerpts.size());
                int variant = command.statementVariantStart() + drafts.size();
                drafts.add(new GeneratedQuestionDraft(
                        content.id(),
                        buildContextualStatement(content.title(), variant),
                        buildAlternatives(excerpt, content.title(), variant),
                        0));
            }
        }
        return drafts;
    }

    private String buildContextualStatement(String title, int variant) {
        return STATEMENT_TEMPLATES.get(Math.floorMod(variant, STATEMENT_TEMPLATES.size())).formatted(title);
    }

    private List<String> buildAlternatives(String excerpt, String title, int variant) {
        String fact = removeTerminalPunctuation(excerpt);
        return List.of(
                excerpt,
                buildContradictoryAlternative(fact, variant),
                buildContentDistractor(title, variant),
                buildReasoningDistractor(title, variant));
    }

    private String buildContradictoryAlternative(String fact, int variant) {
        String normalizedFact = lowercaseFirst(fact);
        return switch (Math.floorMod(variant, 4)) {
            case 0 -> "O material não apresenta a ideia de que " + normalizedFact + ".";
            case 1 -> "A afirmação de que " + normalizedFact + " é tratada como incorreta no conteúdo.";
            case 2 -> "O texto sustenta o contrário da informação de que " + normalizedFact + ".";
            default -> "A explicação estudada não relaciona o tema ao fato de que " + normalizedFact + ".";
        };
    }

    private String buildContentDistractor(String title, int variant) {
        return switch (Math.floorMod(variant, 5)) {
            case 0 -> "No estudo de \"" + title + "\", os conceitos são apresentados sem relação entre si.";
            case 1 -> "O material sobre \"" + title + "\" não descreve processos, relações ou exemplos do tema.";
            case 2 -> "Em \"" + title + "\", as informações devem ser interpretadas sem considerar o conteúdo de referência.";
            case 3 -> "O tema \"" + title + "\" é explicado apenas por opiniões que não aparecem no material.";
            default -> "As ideias de \"" + title + "\" não podem ser confirmadas a partir do conteúdo estudado.";
        };
    }

    private String buildReasoningDistractor(String title, int variant) {
        return switch (Math.floorMod(variant, 5)) {
            case 0 -> "Para compreender \"" + title + "\", é preciso ignorar as relações apresentadas no texto.";
            case 1 -> "A resposta sobre \"" + title + "\" depende somente de informações externas ao material.";
            case 2 -> "O conteúdo de \"" + title + "\" não permite identificar nenhuma explicação fundamentada.";
            case 3 -> "Em \"" + title + "\", as conclusões corretas não precisam ser sustentadas pelo material de referência.";
            default -> "A leitura sobre \"" + title + "\" não apresenta elementos que possam ser usados em uma questão.";
        };
    }

    private String removeTerminalPunctuation(String value) {
        return value.replaceFirst("[.!?]+$", "");
    }

    private String lowercaseFirst(String value) {
        if (value.isBlank()) {
            return value;
        }
        return Character.toLowerCase(value.charAt(0)) + value.substring(1);
    }

    private List<String> extractExcerpts(String body, String title) {
        List<String> excerpts = new ArrayList<>();
        for (String sentence : body.replaceAll("\\s+", " ").split("(?<=[.!?])\\s+")) {
            String normalized = sentence.trim();
            if (normalized.length() >= 12) {
                excerpts.add(truncate(normalized, 900));
            }
        }
        if (excerpts.isEmpty()) {
            excerpts.add("O material de referência trata de " + title + ".");
        }
        return excerpts;
    }

    private String truncate(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength - 3) + "...";
    }
}
