# Publicacao no Railway

Este projeto usa tres servicos no mesmo projeto Railway: `Postgres`, `Backend` e
`Frontend`. Somente o `Frontend` recebe um dominio publico. A API e o banco ficam
na rede privada do Railway.

## 1. Criar o projeto

1. Entre em `https://railway.com` com a conta do GitHub que possui o repositorio
   `Lourran28/sistema-de-provas`.
2. Escolha **New Project** e crie um projeto vazio chamado `Sistema de Provas`.
3. Clique em **New > Database > PostgreSQL** e renomeie o servico para `Postgres`.

## 2. Criar o Backend

1. Clique em **New > GitHub Repo** e selecione `Lourran28/sistema-de-provas` na
   branch `main`.
2. Renomeie o servico para `Backend`.
3. Em **Settings > Build**, defina o **Root Directory** como `/backend`.
4. Em **Settings > Networking**, nao gere dominio publico.
5. Em **Variables > Raw Editor**, adicione:

```text
DATABASE_URL=jdbc:postgresql://${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}
DATABASE_USERNAME=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
SERVER_PORT=8080
JWT_SECRET=<gere-uma-chave-aleatoria-com-32-ou-mais-caracteres>
JWT_ISSUER=provas-api
JWT_EXPIRATION_MINUTES=480
OPENAI_ENABLED=false
```

Depois, selecione a variavel `JWT_SECRET` e use **Seal** para que ela nao possa
ser visualizada novamente no painel.

## 3. Criar o Frontend

1. Adicione novamente o mesmo repositorio pelo **New > GitHub Repo**.
2. Renomeie o servico para `Frontend`.
3. Em **Settings > Build**, defina o **Root Directory** como `/frontend`.
4. Em **Variables > Raw Editor**, adicione:

```text
BACKEND_URL=http://${{Backend.RAILWAY_PRIVATE_DOMAIN}}:8080
```

5. Em **Settings > Networking**, escolha **Generate Domain**, usando a porta
   `80`. Abra o endereco `https://...up.railway.app` gerado para confirmar que a
   tela de login aparece.

## 4. Liberar o acesso da API

No servico `Backend`, adicione esta variavel e mande fazer novo deploy:

```text
APP_CORS_ALLOWED_ORIGINS=https://${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
```

O acesso externo deve existir apenas no `Frontend`. Nao exponha `Backend` nem
`Postgres` com dominio publico.

## IA opcional

O gerador local funciona sem custo com `OPENAI_ENABLED=false`. Para ativar a IA
da OpenAI no futuro, altere apenas no Railway:

```text
OPENAI_ENABLED=true
OPENAI_API_KEY=<sua-chave-da-openai>
OPENAI_MODEL=gpt-5.6-luna
```

Marque `OPENAI_API_KEY` como **Seal**. Nunca coloque essa chave no GitHub, em
arquivos `.env` versionados ou no frontend.

## Atualizacoes e backup

Cada push na branch `main` dispara um deploy dos dois servicos ligados ao GitHub.
Use o recurso de backup do PostgreSQL no Railway antes de alteracoes grandes de
dados ou antes de migrar o banco.
