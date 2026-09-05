# Sistema Web de Geracao e Correcao de Provas

Checkpoint atual: **Checkpoint 22 - Publicacao e operacao**.

Este repositorio esta organizado em:

- `frontend/`: React, TypeScript, Tailwind CSS e React Router.
- `backend/`: Java 21, Spring Boot, Spring Web MVC, Spring Data JPA, Spring Security, Bean Validation, Flyway e PostgreSQL.
- `docker-compose.yml`: PostgreSQL local para desenvolvimento.
- `docs/modelagem.md`: modelagem inicial e garantias de integridade.

## Requisitos locais

- Java 21
- Node.js 24+
- npm
- Docker Desktop

O back-end usa Maven Wrapper, entao Maven global nao e necessario.

## Subir banco local

```bash
docker compose up -d postgres
```

## Rodar back-end

No Windows:

```bash
cd backend
.\mvnw.cmd spring-boot:run
```

Sem Docker, existe tambem um perfil local com banco H2 em arquivo. Ele serve para demonstracao e testes manuais; os dados ficam em `backend/data/` e permanecem após reiniciar a API:

```powershell
$env:SPRING_PROFILES_ACTIVE = "local"
$env:JWT_SECRET = "uma-chave-local-com-no-minimo-32-caracteres"
.\mvnw.cmd spring-boot:run
```

Com esse perfil ativo, a tela de login também oferece `Entrar na demonstração`. Ela cria uma conta local isolada, sem senha fixa exposta no front-end, para abrir o painel rapidamente durante os testes.

API:

```text
GET http://localhost:8080/api/health
```

## Rodar front-end

```bash
cd frontend
npm install
npm run dev
```

Front-end:

```text
http://localhost:5173
```

## Publicacao com Docker

O arquivo `docker-compose.prod.yml` sobe PostgreSQL, API e interface em uma unica rede. A interface atende o sistema e encaminha `/api` internamente para o back-end, sem expor a porta da API na internet.

1. Copie `.env.production.example` para `.env.production` e preencha senhas longas e unicas.
2. Atualize `APP_CORS_ALLOWED_ORIGINS` com o dominio final que usara HTTPS.
3. Suba a aplicacao com:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

O sistema ficara disponivel em `http://localhost:8088` por padrao. Em hospedagem publica, coloque um proxy HTTPS gerenciado pelo provedor na frente dessa porta e direcione o dominio para ele.

## Backup do PostgreSQL

Com a aplicacao de producao em execucao, crie um backup SQL em `backups/`:

```powershell
.\scripts\backup-postgres.ps1
```

Para restaurar um backup, use o script abaixo somente quando tiver certeza, pois ele altera os dados do banco:

```powershell
.\scripts\restore-postgres.ps1 -BackupFile .\backups\provas-AAAAMMDD-HHMMSS.sql
```

## Variaveis principais

Back-end:

```text
SERVER_PORT=8080
DATABASE_URL=jdbc:postgresql://localhost:5432/provas
DATABASE_USERNAME=provas
DATABASE_PASSWORD=provas
APP_CORS_ALLOWED_ORIGINS=http://localhost:5173
JWT_SECRET=uma-chave-secreta-com-no-minimo-32-caracteres
JWT_ISSUER=provas-api
JWT_EXPIRATION_MINUTES=480
```

Front-end:

```text
VITE_API_URL=http://localhost:8080/api
```

`JWT_SECRET` é obrigatório para iniciar o back-end e não deve ser versionado. No PowerShell, defina-o antes de iniciar a API:

```powershell
$env:JWT_SECRET = "substitua-por-uma-chave-secreta-longa-e-unica"
```

## Autenticação

- `POST /api/auth/register`: cria uma conta de professor.
- `POST /api/auth/login`: inicia uma sessão e retorna um token JWT.
- `GET /api/auth/me`: retorna o perfil da sessão autenticada.
- `PATCH /api/auth/me`: atualiza nome e e-mail da conta autenticada.
- `PATCH /api/auth/me/password`: troca a senha com confirmação da senha atual e encerra as sessões existentes.
- `POST /api/auth/password/forgot`: solicita um link de recuperação, sem revelar se o e-mail está cadastrado.
- `POST /api/auth/password/reset`: consome o link uma única vez e define a nova senha.

### E-mail de recuperação (Brevo)

Configure no **backend** (Render > Environment), nunca em variáveis `VITE_`:

```text
SPRING_MAIL_HOST=smtp-relay.brevo.com
SPRING_MAIL_PORT=2525
SPRING_MAIL_USERNAME=login SMTP exibido no Brevo
SPRING_MAIL_PASSWORD=chave SMTP do Brevo, não a senha do Gmail
SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true
SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=true
SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_REQUIRED=true
APP_MAIL_FROM=seu-remetente-verificado@exemplo.com
APP_FRONTEND_URL=https://seu-frontend.vercel.app
```

O [Render gratuito bloqueia as portas 25, 465 e 587](https://render.com/docs/free). O [Brevo oferece a porta 2525 com TLS](https://help.brevo.com/hc/en-us/articles/10905415650322-Which-SMTP-port-should-I-use-Port-587-465-or-2525), alternativa a testar nesse ambiente. Em hospedagens sem esse bloqueio, 587 também pode ser usada.

Se o bloqueio de IPs não autorizados estiver ativo no Brevo, autorize os IPs de saída do backend, consultados em [Render > Connect > Outbound](https://render.com/docs/outbound-ip-addresses). Não use o IP do seu computador. Verifique também a ativação do envio transacional e o remetente; um Gmail verificado não equivale a um domínio autenticado. Para produção, prefira um domínio próprio com DKIM/DMARC configurados.

Salve as variáveis e faça novo deploy. Depois teste `Esqueci minha senha` com uma conta já cadastrada. Confira a caixa de entrada/spam e os logs transacionais do Brevo. A resposta 204 da API confirma o recebimento da solicitação, **não a entrega do e-mail**.

Os links expiram em 15 minutos, são armazenados apenas como hash e são invalidados após uso, troca de senha ou alteração do e-mail. Há intervalo mínimo de um minuto entre emissões por conta. O envio acontece fora da requisição HTTP e da transação do banco, em fila limitada em memória; reinícios ou fila cheia podem descartar solicitações, exigindo um novo pedido. Erros de envio são registrados sem expor e-mail, chave ou token. A conexão SMTP tem limite de 5 segundos e leitura/escrita de 10 segundos.

Os testes de integração usam H2 isolado e um remetente simulado, sem disparar e-mails reais:

```powershell
cd backend
.\mvnw.cmd test
```

Os testes de navegador simulam a API e cobrem recuperação e troca de senha em desktop e celular. Com Google Chrome instalado:

```powershell
cd frontend
npm ci
npm run test:e2e
```

## Disciplinas e conteúdos

- `GET`, `POST`, `PATCH` e `DELETE /api/subjects`: disciplinas da conta autenticada.
- `GET`, `POST`, `PATCH` e `DELETE /api/contents`: conteúdos da conta autenticada.
- `GET /api/contents/topics`: assuntos disponíveis para filtro.

As rotas de conteúdos aceitam `search`, `subjectId`, `topic`, `page` e `size`. O servidor sempre aplica o identificador do professor autenticado e não confia em IDs de proprietário enviados pelo cliente.

## Alunos e turmas

- `GET /api/students`: lista alunos do professor, com filtro opcional por `search` e `classGroup`.
- `POST /api/students`: cadastra um aluno com nome, turma e matrícula opcional.
- `PATCH` e `DELETE /api/students/{studentId}`: atualiza ou remove um aluno.

Cada aluno pertence apenas ao professor que o cadastrou. A matrícula, quando informada, não pode ser repetida na mesma conta. As correções mantêm o nome e a turma como histórico; por isso, remover um aluno não apaga as correções que já foram realizadas.

## Banco de questões e provas

- `GET`, `POST`, `PATCH` e `DELETE /api/questions`: banco de questões do professor autenticado.
- `DELETE /api/questions`: limpa o banco de questões da conta autenticada. Questões sem uso são removidas; questões já vinculadas a provas são arquivadas para preservar versões, gabaritos e correções.
- `GET`, `POST /api/exams`: lista e cria provas manuais em rascunho.
- `PATCH /api/exams/{examId}`: atualiza dados, questões e ordem de uma prova em rascunho.
- `POST /api/exams/generate`: gera um rascunho a partir dos conteúdos selecionados.
- `POST /api/exams/{examId}/questions/{questionId}/regenerate`: substitui uma questão usando o mesmo conteúdo de origem.
- `POST /api/exams/{examId}/approve`: aprova um rascunho revisado.
- `POST /api/exams/{examId}/versions`: gera as versões oficiais A, B e C para uma prova aprovada.
- `GET /api/exam-versions?examId={id}`: consulta as versões de uma prova.
- `GET /api/exam-versions`: consulta todos os gabaritos e versões do professor autenticado.

Questões de múltipla escolha aceitam de 2 a 8 alternativas e exigem uma única resposta correta. Quando um conteúdo de origem é escolhido, o vínculo é persistido em `question_contents`; o servidor também confirma que conteúdo, disciplina, questão e prova pertencem ao professor da sessão.

Ao criar uma prova, questões repetidas são rejeitadas e a nota total é distribuída com precisão entre as questões selecionadas.

Enquanto a prova estiver em rascunho, a tela de revisão permite editar título, disciplina, turma, assunto, data, nota, descrição e instruções. Também permite adicionar ou remover questões do banco e reorganizar a ordem. A API bloqueia qualquer alteração depois da aprovação para preservar as versões e os gabaritos oficiais.

Na geração por conteúdo, o servidor envia ao gerador somente os conteúdos escolhidos pelo professor e mantém o vínculo de origem de cada questão. Nesta etapa há um gerador local controlado, preparado para ser trocado por um provedor de IA externo em produção. A prova sempre começa como rascunho para revisão e aprovação do professor.

Depois da aprovação, a prova pode gerar as versões oficiais A, B e C. Cada versão persiste sua própria ordem de questões e alternativas. O gabarito é calculado a partir do ID da alternativa correta depois do embaralhamento, mantendo a letra certa para cada versão sem depender da posição original.

Depois que as versões forem geradas, a revisão da prova permite registrar a aplicação para uma turma. O professor informa a data, marca presenças e ausências e registra qual versão A, B ou C foi entregue a cada aluno. Esse histórico permanece associado à prova e marca seu status como aplicada.

## Impressão

Cada versão oficial possui uma tela de impressão própria, acessível pelo botão `Imprimir` na revisão da prova ou na área de gabaritos. Ela oferece três documentos independentes:

- prova para o aluno, sem respostas corretas;
- cartão-resposta com campos de identificação, bolhas de marcação e marcadores de alinhamento;
- gabarito para o professor.

O cartão-resposta traz quatro marcadores de alinhamento ao redor da grade para orientar a leitura das bolhas. A impressão usa o diálogo nativo do navegador, que permite salvar o documento como PDF.

## Correção e resultados

A área `Correção` permite selecionar a versão da prova, escolher um aluno cadastrado ou preenchê-lo manualmente, e enviar ou fotografar o cartão-resposta. A leitura inteligente analisa as bolhas preenchidas e preenche as respostas para conferência. A nota é calculada a partir do gabarito imutável da versão entregue ao aluno, nunca pela posição original das alternativas.

- `GET /api/corrections`: lista correções do professor.
- `GET /api/corrections/{id}`: consulta uma correção.
- `POST /api/corrections`: calcula e salva uma correção pendente de revisão.
- `PATCH /api/corrections/{id}`: ajusta respostas antes da confirmação.
- `POST /api/corrections/{id}/confirm`: confirma a nota depois da revisão humana.

O sistema não confirma uma nota automaticamente: respostas em branco, marcações duplas ou marcas fracas permanecem visíveis para revisão antes da confirmação final.

As correções pendentes também ficam disponíveis na área `Revisões pendentes`. Nela o professor pode retomar uma leitura já salva, corrigir cada bolha, recalcular a nota e confirmar o resultado somente depois da conferência. O Dashboard direciona diretamente para essa fila quando existem revisões aguardando ação.

Para uma turma inteira, a área `Correção em lote` recebe até 30 fotos de cartões da mesma versão. O navegador analisa as imagens uma por vez, o professor associa cada cartão a um aluno cadastrado e todas as leituras são enviadas somente para a fila de revisão. Nenhuma nota do lote é confirmada automaticamente.

O cartão-resposta impresso inclui quatro marcadores de alinhamento ao redor da grade. Na área de correção, o professor pode enviar uma imagem ou abrir a câmera traseira do celular para fotografar o cartão. A foto é analisada diretamente: marcações reconhecidas ficam em verde, respostas em branco em cinza e leituras incertas em amarelo. O professor sempre pode corrigir cada resposta antes de salvar e confirmar a nota.

A área `Resultados` permite filtrar o histórico por prova e versão, turma, situação e aluno. As médias e o aproveitamento são calculados somente com correções confirmadas; itens ainda em revisão aparecem em separado. A tela consolida o acompanhamento por turma e por aluno, ajuda a identificar quem precisa de reforço, apresenta o desempenho por questão para uma versão específica e permite exportar os resultados visíveis em CSV.

A área `Boletins` organiza as correções confirmadas no histórico individual de cada aluno. Ela apresenta provas realizadas, notas, acertos, aproveitamento médio e melhor resultado. O boletim usa o diálogo nativo de impressão do navegador, podendo ser impresso ou salvo como PDF.

O `Dashboard` consulta os dados reais da conta e reúne contadores de provas, questões, conteúdos e correções confirmadas. Ele também mostra provas recentes, últimas atividades, atalhos de navegação e um aviso acionável para correções que ainda precisam de revisão.

No `Perfil`, o professor pode editar nome e e-mail. A API normaliza os valores, valida o formato do e-mail e impede que uma conta use o e-mail de outra conta.
