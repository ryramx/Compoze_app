# Deploy

O ambiente de staging vive no Render e é descrito em [`render.yaml`](../../render.yaml)
(Blueprint): infraestrutura como código, revisada em PR como o resto.

## Onde cada peça roda

| Recurso | Onde | Plano | Para quê |
| --- | --- | --- | --- |
| Banco | **Neon** | grátis | PostgreSQL 18; PostGIS e demais extensões são criadas pela migração 0000 |
| `compoze-api-staging` | Render, web service Node | `free` | API; migra o banco ao subir; health check em `/health` |
| `compoze-web-staging` | Render, static site | grátis | Front (SPA), com reescrita de rotas para `index.html` |

API e front ficam na região **Virgínia** do Render; o banco, na região AWS
**us-east-1** do Neon, no mesmo lugar, para a latência entre os dois ser mínima.

O Blueprint não declara `projects:`: o plano Hobby do Render limita a quantidade
de projetos, e a conta já tem um.

Por que o banco fora do Render: o Postgres grátis do Render é apagado em 30
dias, e o pago pede cartão. O plano grátis do Neon não expira; o banco "dorme"
sem uso e acorda na primeira consulta (um ou dois segundos). Para produção,
reavaliamos (Neon pago ou Postgres do Render).

A API no plano grátis do Render também dorme sem uso e leva alguns segundos
para acordar, o que serve para staging.

## Primeira vez

### 1. Banco no Neon

1. Criar conta em neon.tech e um projeto novo:
   - **Postgres version: 18** (o schema usa `uuidv7()`, que só existe no 18);
   - **Region: AWS US East (N. Virginia)**.
2. No painel do projeto, **Connect**: copiar a connection string com
   **"Connection pooling" desligado** (a URL *sem* `-pooler` no host). As
   migrações e a fila de jobs precisam da conexão direta.
3. A URL tem a forma
   `postgresql://usuario:senha@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require`.

### 2. API e front no Render

1. **New → Blueprint**, escolher o repositório `Compoze_app`, branch `main`.
2. O Render pede o valor de `DATABASE_URL`: colar a URL do Neon.
3. Aplicar. Quando terminar, abrir `https://compoze-api-staging.onrender.com/health`:
   deve responder `"status": "ok"` com a versão 18 do banco.

Se o nome `compoze-web-staging` já estiver em uso no Render, o front ganha outra
URL: ajuste `CORS_ORIGINS` da API para ela.

## Deploys seguintes

`autoDeployTrigger: checksPass`: cada merge na `main` publica sozinho, mas só
depois que a CI passa. O `buildFilter` evita rebuild da API quando só o front
mudou, e vice-versa.

Migrações rodam na subida da API, antes de ela aceitar tráfego. Se uma
migração falhar, a API não sobe e o Render mantém a versão anterior no ar.

O front é uma PWA (Fase 2c). O `sw.js`, o `manifest.webmanifest` e o
`index.html` vão com `Cache-Control: no-cache`, para que o service worker
encontre logo a versão nova. Quem está com o app aberto vê o aviso "Há uma
versão nova do Compoze" e escolhe a hora de atualizar.

## Campos que não mudam depois de criados

`postgresMajorVersion`, `databaseName`, `user` e `region` do banco, e `type` e
`runtime` dos serviços. Mudar qualquer um deles no `render.yaml` exige um
recurso novo (e migrar os dados).

## Front e API

O front de staging aponta para `https://compoze-api-staging.onrender.com`. Se o
Render der outra URL à API (nome já em uso), ajuste `VITE_API_URL` no front e
faça um novo deploy dele: a variável entra no bundle na hora do build.

`JWT_SECRET` é gerado pelo próprio Render na criação. Trocar o valor desloga
todo mundo (os tokens antigos deixam de valer), o que serve de "botão de
pânico" se o segredo vazar.

O expurgo da lixeira roda dentro da API, às 3h. No plano grátis a API dorme sem
uso; se estiver dormindo nessa hora, o pg-boss roda o job quando ela acordar.

## E-mail dos convites (desligado)

Os convites funcionam por link sem nenhum e-mail (ADR 0010). O e-mail é um
extra e está desligado: a conta no Resend existe, mas sem domínio próprio
verificado o Resend só entrega para o e-mail da própria conta.

Para ligar, quando houver um domínio:

1. No Resend, em **Domains**, adicionar o domínio e criar no registro dele os
   registros DNS que o Resend mostrar. Esperar o domínio ficar "Verified".
2. Em **API Keys**, criar uma chave com permissão só de envio ("Sending
   access").
3. No Render, em `compoze-api-staging` → **Environment**:
   - `RESEND_API_KEY`: a chave. Colar direto aqui, nunca em chat ou no
     repositório.
   - `EMAIL_FROM`: o remetente no domínio verificado, por exemplo
     `Compoze <convites@seudominio.com.br>`.
4. Salvar. O Render reinicia a API, e o log mostra "e-mail ligado (Resend)".
   O diálogo de convite passa a mostrar o campo de e-mail.

Os links dos e-mails apontam para a primeira origem de `CORS_ORIGINS` (o front
de staging). `WEB_URL` troca esse endereço, se precisar.
