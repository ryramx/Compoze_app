# Plano do backend

Status: **aceito** em 2026-10-22 ([ADR 0004](../decisoes/0004-stack-do-backend.md)).
Mobile e offline: [ADR 0005](../decisoes/0005-mobile-e-offline.md).
Ponto de partida: do zero. Nada de backends anteriores é reaproveitado; a
referência é o [contrato da API](contrato-da-api.md) que o frontend novo já
consome. Única exigência fixa: **PostgreSQL**.

## 1. O que o backend precisa resolver

Antes da stack, o que o Compoze pede de um servidor:

| Necessidade | Por quê | Implicação técnica |
| --- | --- | --- |
| Dados muito relacionais | Canção ↔ blocos ↔ coautores ↔ pastas ↔ projetos ↔ pessoas | Postgres com chaves estrangeiras e transações; ORM que não esconda SQL |
| Regras de integridade | Soma 100% (RN05), dono único, ciclos de pasta, lixeira | Restrições no banco + validação na borda |
| Escrita a várias mãos | O produto é coautoria; hoje dois editores simultâneos se sobrescrevem | Edição colaborativa em tempo real (CRDT) com presença |
| Prova de autoria | Estágio "Registrada": quem escreveu o quê, e quando | Histórico de versões imutável, com hash |
| Busca em português | Achar por verso, tag ou título, sem acento | `unaccent` + `pg_trgm` + full-text `portuguese` |
| Geografia | Mapa de quem compõe perto (RN11) | PostGIS |
| Processos agendados | Expurgo da lixeira (RN08), e-mails, notificações | Fila de jobs |
| Arquivos | Capas, avatares, demos em áudio | Storage S3 com upload direto (URL pré-assinada) |
| Social e mensagens | Mural, conversas (Fase 4) | WebSocket, notificações |
| **Uso offline no celular** | A ideia vem onde não tem sinal; coautores editam a mesma canção offline | Dados local-first: CRDT (Yjs) para a letra, fila de operações idempotentes e delta por cursor para o resto, ids gerados no aparelho (ADR 0005) |

## 2. Stack recomendada

**TypeScript de ponta a ponta, num monorepo com o frontend.**

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Runtime | **Node.js 24 LTS** | LTS atual; mesmo runtime do tooling do front |
| Framework HTTP | **Fastify 5** | Rápido, maduro, ecossistema oficial (CORS, rate limit, WebSocket, multipart, Swagger), logs estruturados com pino nativos |
| Validação e contrato | **Zod** em `packages/contracts` + `fastify-type-provider-zod` | O mesmo schema valida a requisição no servidor, tipa o cliente no front e gera o OpenAPI. Fim da classe de bug "front e back discordam do formato" |
| Banco | **PostgreSQL 18** + `pg_trgm`, `unaccent`, `citext`, **PostGIS** | Exigência, e a versão que já roda na máquina de desenvolvimento. O 18 traz `uuidv7()` nativo (ids ordenáveis por tempo, sem extensão), I/O assíncrono (leituras mais rápidas nas listagens) e `RETURNING OLD/NEW` (útil no histórico de versões). As extensões cobrem busca em PT-BR e mapa sem serviço extra |
| Acesso a dados | **Drizzle ORM** + `drizzle-kit` | SQL-first e tipado: o schema é TypeScript, as consultas parecem SQL, migrações versionadas em arquivos `.sql` revisáveis |
| Autenticação | **Própria**: argon2id + JWT (`jose`) + refresh rotacionado ([ADR 0006](../decisoes/0006-autenticacao-propria.md)) | Mantém o contrato que o front já usa e o par curto + longo que o offline pede. Better Auth reavaliado quando vierem verificação de e-mail, reset de senha e OAuth |
| Tempo real | **Yjs + Hocuspocus** | CRDT padrão de mercado para edição colaborativa; presença e cursores reais (substitui os cursores simulados do protótipo antigo); persistência no Postgres |
| Jobs | **pg-boss** | Fila sobre o próprio Postgres: expurgo da lixeira, e-mails, notificações. Sem Redis para operar |
| Arquivos | **S3 compatível** (Cloudflare R2) | Upload direto do navegador com URL pré-assinada; sem custo de saída no R2 |
| E-mail | **Resend** | API simples, templates em React (mesma stack) |
| Testes | **Vitest** + **Testcontainers** (Postgres real) + `fastify.inject` | Testa contra o banco de verdade, não contra mock; mesmo runner do front |
| Observabilidade | pino → **OpenTelemetry**; **Sentry** para erros | Rastreio de requisição do front ao banco |
| Monorepo | **pnpm workspaces** + **Turborepo** | Cache de build/teste e um comando para tudo |
| Deploy | **Render**: static site (web), web service (API + Hocuspocus), background worker (jobs), Postgres gerenciado com PostGIS | Tudo num lugar, com preview por PR; alternativa equivalente: Railway ou Fly.io + Neon |

### Por que não as alternativas

- **FastAPI (Python) + SQLAlchemy + Alembic.** Stack excelente, e era o que o
  contrato antigo pressupunha. Perde aqui por três motivos: dois idiomas no
  mesmo produto (tipos duplicados à mão entre front e back, que é exatamente o
  que `adapters.ts` existe para remendar); o ecossistema de edição colaborativa
  (Yjs, Hocuspocus, ProseMirror) é nativo de JavaScript; e um time pequeno
  rende mais com um só toolchain. Continua sendo a melhor alternativa se o time
  for mais forte em Python.
- **NestJS.** Estrutura boa para times grandes, mas traz decorators, injeção de
  dependência e cerimônia que um produto deste tamanho não precisa.
- **Hono.** Ótimo para edge/serverless. O Compoze precisa de conexões longas
  (WebSocket do editor) e de Postgres com extensões, o que favorece um servidor
  Node tradicional.
- **Prisma.** Produtivo, mas abstrai demais o SQL; extensões como PostGIS e
  buscas com `pg_trgm` acabam em `queryRaw`. Drizzle mantém isso tipado.
- **Supabase/Firebase como backend.** Aceleram o CRUD, mas as regras do
  Compoze (RN05, autoria, versões) iriam para políticas RLS e funções
  espalhadas. Ficamos com um servidor próprio e Postgres puro — que pode, se
  quiser, ser hospedado no Supabase/Neon.

## 3. Arquitetura

```
apps/
  web/                 frontend (já existe)
  api/                 Fastify: REST /v1, auth, regras de negócio
    src/
      modules/
        auth/          cadastro, login, refresh (ADR 0006)
        users/
        songs/         canções, blocos, coautoria, lixeira
        folders/
        projects/
        map/
        sync/          delta por cursor e lote de operações (Fase 2)
        social/        Fase 4
      db/
        schema/        tabelas Drizzle, uma por arquivo
        migrations/    SQL gerado e revisado
      jobs/            pg-boss: expurgo, e-mails
      plugins/         auth, erros, rate limit, cors, openapi
      server.ts
  collab/              Hocuspocus: sincroniza o documento Yjs de cada canção (Fase 2;
                       por ora dentro de apps/api, em src/modules/colab)
  worker/              consumidor de jobs (pode começar dentro da api)
packages/
  contracts/           schemas Zod compartilhados (requisição/resposta)
  db/                  schema Drizzle compartilhado entre api, collab e worker
  config/              tsconfig, eslint
```

Cada módulo segue a mesma forma: `rotas.ts` (HTTP, valida com o contrato) →
`servico.ts` (regras de negócio, transações) → `repositorio.ts` (Drizzle). Regra
de negócio nunca mora em rota nem em SQL solto.

Autorização é por recurso e acontece no serviço: toda consulta de canção filtra
por "é dona ou coautora". Responder `404` (e não `403`) para quem não tem
acesso evita revelar que o recurso existe.

## 4. Modelo de dados (v1)

```
users              id uuid pk default uuidv7(), name, username citext unique, email citext unique,
                   bio, avatar_url, city, state, country,
                   location geography(Point) null, show_on_map bool,
                   instruments text[], specialties text[], genres text[],
                   external_links text[], created_at, updated_at
refresh_tokens     id, user_id, family_id, token_hash, expires_at, used_at, revoked_at

folders            id, owner_id → users, parent_id → folders null, name,
                   created_at, updated_at
                   CHECK sem ciclo (validado no serviço + trigger)

songs              id, owner_id → users, folder_id → folders null (ON DELETE SET NULL),
                   title, description, status song_status, visibility visibility,
                   musical_key, bpm smallint CHECK 20..300, time_signature,
                   tags text[], contributions_confirmed bool,
                   search tsvector (gerada), deleted_at null,
                   created_at, updated_at
                   índices: (owner_id, deleted_at), GIN(search), GIN(tags),
                            trigram em title

song_blocks        id, song_id → songs ON DELETE CASCADE, type block_type,
                   label, content, position int, author_id → users,
                   created_at, updated_at
                   UNIQUE (song_id, position) DEFERRABLE

song_collaborators id, song_id, user_id, role collaborator_role,
                   contribution_percent numeric(5,2) null CHECK 0..100,
                   invited_by, created_at
                   UNIQUE (song_id, user_id)

song_versions      id, song_id, number, snapshot jsonb, sha256, created_by,
                   reason (manual | estágio | registro), created_at
                   — imutável: base da prova de autoria

song_documents     song_id pk, ydoc bytea, updated_at        (Yjs; fonte do conteúdo a partir da Fase 2)
song_memos         id, song_id, author_id, title, duration_ms, mime_type, size_bytes, created_at (ADR 0012)
song_memo_audio    memo_id pk, bytes bytea                   (áudio à parte; vai para o S3 quando houver)

projects           id, owner_id, name, description, type, status, style,
                   release_date date, cover_url, estimated_cost int,
                   funding_target int, funding_current int,
                   deleted_at, created_at, updated_at

project_songs      project_id, song_id, track_number, PRIMARY KEY (project_id, song_id)
```

Todas as chaves primárias usam `uuid DEFAULT uuidv7()`, nativo do Postgres 18,
**mas aceitam o id enviado pelo cliente**: algo criado offline já nasce com o
id definitivo (ADR 0005). Toda tabela que sincroniza tem ainda `version int`
(incrementada a cada escrita), `updated_at` definido pelo servidor e exclusão
lógica (`deleted_at`), para que o delta consiga informar o que foi apagado.

Fase 4 acrescenta `follows`, `posts`, `post_likes`, `comments`,
`conversations`, `conversation_members`, `messages`, `notifications`.

**Onde cada regra vive**

| Regra | Banco | Serviço |
| --- | --- | --- |
| RN05 soma 100 ao confirmar | — | transação que soma e só então marca `contributions_confirmed` |
| Uma dona por canção | índice parcial `UNIQUE (song_id) WHERE role = 'OWNER'` | — |
| RN07 lixeira preserva lugar | `deleted_at`, nada é desvinculado | filtros `deleted_at IS NULL` |
| RN08 expurgo em 30 dias | — | job diário pg-boss |
| RN11 mapa só com opt-in | `location` nula por padrão | `/map/people` filtra `show_on_map`; perfil público nunca seleciona `location` |
| Pasta sem ciclo | trigger | checagem antes do `UPDATE` |

## 5. Editor colaborativo e offline (Fase 2)

Até a Fase 1 o editor salvava bloco a bloco com atraso de 600 ms; duas pessoas
editando o mesmo bloco ao mesmo tempo perdiam texto, e nada funcionava sem
rede. A Fase 2 troca isso pelo que segue. Os itens 1 a 6 estão feitos (Fase 2a,
detalhes no [ADR 0007](../decisoes/0007-documento-yjs-da-cancao.md); Fase 2b,
no [ADR 0008](../decisoes/0008-fila-offline-sobre-o-rest.md)):

1. Cada canção é um documento Yjs (`Y.Array` de blocos, cada bloco um `Y.Map`
   com `Y.Text`). A autoria por trecho vem dos atributos de inserção do Yjs, o
   que permite marcar autoria por palavra, não só por bloco.
2. O navegador conecta ao Hocuspocus via WebSocket em `/collab`, autenticado
   com o mesmo token. Na Fase 2a ele roda dentro do processo da API.
3. O Hocuspocus persiste o estado binário em `song_documents` e, com debounce,
   **projeta** os blocos em `song_blocks` — que continua sendo a fonte para
   busca, listagens e a API REST.
4. Presença (quem está na canção, onde está o cursor) vem do awareness do Yjs.
5. No aparelho, o mesmo documento fica salvo no IndexedDB (`y-indexeddb`).
   Edições offline são fundidas na reconexão, sem conflito.
6. Os dados estruturados vão por uma fila no aparelho que chama as rotas REST
   de sempre, cada chamada com `Idempotency-Key`; o caderno fica copiado no
   IndexedDB. As rotas `/sync/changes` e `/sync/push` do ADR 0005 ficaram
   adiadas (ADR 0008).
7. Mudança de estágio para "Registrada" grava um `song_versions` com hash.

## 6. Segurança

- Senhas com argon2id (ADR 0006). Rate limit por IP e por conta em login,
  cadastro e reset.
- Tokens de acesso curtos; refresh rotacionado e revogável.
- CORS restrito ao domínio do front. Cabeçalhos com `@fastify/helmet`.
- Toda entrada validada pelo schema Zod; respostas também passam pelo schema
  (não vaza campo que não está no contrato, como `email` em perfil público).
- Uploads só por URL pré-assinada com tipo e tamanho fixados.
- Logs sem dados pessoais; auditoria de mudanças de coautoria.

## 7. Fases

| Fase | Entrega | Pronto quando |
| --- | --- | --- |
| **0 · Fundação** | Turborepo, `packages/contracts` e `packages/db`, `apps/api` com Fastify, Drizzle e primeira migração, Docker Compose com Postgres 18 + PostGIS (mesma versão do ambiente local), CI (lint, typecheck, testes com Testcontainers), deploy de staging | `GET /health` em staging; CI verde |
| **1 · MVP do contrato** | Auth, pessoas, canções, blocos, coautoria (RN05), lixeira + expurgo (RN07/08), pastas, projetos, mapa (RN11), as pendências 1 e 2 do contrato | Front com `VITE_API_URL` apontando para staging, sem modo demo; cobertura de cada RN por teste |
| **2 · Escrita junto e offline** | Hocuspocus + Yjs no editor, presença, rotas de sincronização, banco local e fila no front, PWA instalável (service worker), convites por e-mail, histórico de versões e registro com hash | Duas pessoas editam o mesmo verso, uma delas offline, e nada se perde; o app abre e edita em modo avião |
| **3 · Nas lojas** | Capacitor (iOS e Android), armazenamento seguro de tokens, SQLite nativo, gravação de memo de voz, compartilhar para o app, notificações push | App publicado na App Store e na Play Store |
| **4 · Gente** | Seguidores, mural, conversas em tempo real, uploads (avatar, capa, áudio), financiamento (PIX via Mercado Pago ou Stripe) | Telas de Mural e Conversas sem o aviso de prévia |

## 8. Próximos passos

1. ~~Confirmar a stack (ADR 0004).~~ Feito.
2. ~~Fase 0 neste repositório: `apps/api`, `packages/contracts`, `packages/db`,
   já com as colunas de sincronização do ADR 0005.~~ Feito. Staging descrito em
   `render.yaml` ([deploy.md](deploy.md)). Guia de uso em
   [desenvolvimento.md](desenvolvimento.md).
3. ~~Fase 1: rotas do contrato v1 com testes contra o banco real.~~ Feito, e no ar em
   staging (Render + Neon) desde 2026-10-22.
4. ~~Trocar `services/api/dto.ts` do front pelos tipos de `packages/contracts`.~~
   Feito: respostas e corpos de requisição vêm dos schemas.
5. ~~Fase 2a: Hocuspocus + Yjs no editor, presença, documento salvo no
   aparelho.~~ Feito (ADR 0007).
6. ~~Fase 2b: fila de envio e cópia do caderno no front, `Idempotency-Key`
   na API (título, ficha, pastas e projetos offline).~~ Feito (ADR 0008).
7. ~~Fase 2c: PWA instalável (o app abre sem rede).~~ Feito: o app instala na
   tela inicial, abre e edita em modo avião, inclusive recarregando.
8. ~~Fase 2d: histórico de versões e registro com hash (ADR 0009); convites
   pela conta, por link e por e-mail (ADR 0010).~~ Feito. O e-mail fica
   desligado até haver um domínio verificado no Resend.
9. ~~Fase 3a: app Android pelo Capacitor, APK nos Releases, sem loja
   (ADR 0011).~~ Feito; v0.1.0 publicada em 2026-10-25.
10. ~~Fase 3b: aviso de versão nova no app e "Compartilhar para o Compoze"
    (Android e PWA).~~ Feito.
11. ~~Fase 3c: memos de voz na canção, gravados offline (ADR 0012).~~ Feito.
    O que resta da Fase 3 depende de conta paga ou de serviço externo: lojas
    (Play US$ 25, Apple US$ 99/ano), notificações push (projeto no Firebase),
    tokens no Keystore e SQLite nativo (só com a loja).
