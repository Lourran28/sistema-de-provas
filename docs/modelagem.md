# Modelagem PostgreSQL

Este checkpoint cria a base relacional do sistema para preservar rastreabilidade, autoria e reproducibilidade das provas.

## Entidades centrais

- `users`: professores e futuros perfis administrativos. A senha sera armazenada como hash, nunca texto puro.
- `subjects`: disciplinas pertencentes a um professor.
- `contents`: materiais cadastrados pelo professor e usados como fonte factual para questoes.
- `questions`: questoes manuais ou geradas por IA.
- `alternatives`: alternativas identificadas por ID proprio; a correcao nunca depende apenas da letra.
- `question_contents`: vinculo persistente entre questao e conteudo de origem.
- `exams`: prova em estado de rascunho, revisao, pronta, versionada, aplicada ou corrigida.
- `exam_contents`: conteudos explicitamente selecionados para uma prova.
- `exam_questions`: questoes que compoem uma prova.
- `exam_versions`: versoes oficiais A/B/C com identificador opaco para QR Code.
- `exam_version_questions`: ordem persistida das questoes em cada versao.
- `exam_version_alternatives`: ordem persistida das alternativas em cada versao.
- `answer_keys` e `answer_key_items`: gabarito calculado por versao usando `alternative_id`.
- `corrections`: correcao de um aluno para uma versao especifica.
- `student_answers`: respostas detectadas pelo OMR e ajustadas na revisao humana.

## Garantias de integridade

- Cada conteudo, questao e prova pertence a um professor por `teacher_id`.
- A geracao por IA deve receber apenas IDs de conteudos; o back-end buscara no banco somente conteudos do professor autenticado.
- Toda questao gerada sera gravada em `questions` e vinculada aos conteudos em `question_contents`.
- Regenerar uma questao deve reutilizar o mesmo `content_id`, salvo alteracao explicita do professor.
- Versoes A/B/C sao persistidas em tabelas de composicao. Abrir a mesma versao novamente nao dispara novo embaralhamento.
- Gabaritos sao derivados da alternativa correta por ID depois do embaralhamento.
- Correcoes so podem ser persistidas como definitivas apos revisao humana.

## Operacoes transacionais obrigatorias

- Criacao de prova gerada por conteudo.
- Substituicao/regeneracao de questoes.
- Aprovacao da prova.
- Geracao das versoes A/B/C.
- Geracao de gabaritos.
- Confirmacao de correcao.

