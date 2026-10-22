# Backend: como desenvolver

Guia do dia a dia em `apps/api`, `packages/db` e `packages/contracts`. O porquê
da stack está no [ADR 0004](../decisoes/0004-stack-do-backend.md); o plano por
fases, em [plano.md](plano.md).

## Peças

```
packages/contracts   Schemas Zod do contrato (enums, erro, health). Fonte única:
                     a API valida com eles, o banco cria os enums a partir deles
                     e o front vai tipar o cliente com eles (Fase 1).
packages/db          Schema Drizzle (uma tabela por arquivo em src/schema),
                     migrações SQL em migrations/, conexão (`conectar`) e
                     `migrar`.
apps/api             Fastify 5. `src/app.ts` monta a API sem abrir porta;
                     `src/servidor.ts` migra, sobe e escuta. Cada domínio vira
                     uma pasta em src/modules.
```

## Rodando local

Requisitos: Node 24 (22 também funciona), pnpm 10 e Docker.

```bash
pnpm install
pnpm db:up                               # PostgreSQL 18 + PostGIS na porta 5432
cp apps/api/.env.example apps/api/.env
pnpm dev:api                             # http://localhost:3333
```

- `GET /health` diz se a API está de pé e alcança o banco (e qual versão dele).
- `/docs` abre o Swagger UI; `/docs/json` é o OpenAPI gerado dos schemas Zod.
- As migrações rodam sozinhas na subida. Para rodar à parte: `pnpm db:migrate`.

Se você já tem um PostgreSQL 18 na máquina, pode pular o Docker: aponte
`DATABASE_URL` para ele. O PostGIS precisa estar instalado (a primeira
migração cria a extensão).

## Variáveis de ambiente

Validadas na subida por `src/config.ts`; faltando algo, a API não sobe e diz o quê.

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `DATABASE_URL` | — (obrigatória) | Conexão com o Postgres |
| `PORT` / `HOST` | `3333` / `0.0.0.0` | Onde escutar |
| `CORS_ORIGINS` | `http://localhost:5173` | Origens do front, separadas por vírgula |
| `LOG_LEVEL` | `info` | Nível do pino |
| `NODE_ENV` | `development` | Em `development` os logs saem formatados |

## Mudando o banco

1. Edite o schema em `packages/db/src/schema/`.
2. `pnpm db:generate` gera o SQL em `packages/db/migrations/`. **Leia o SQL**:
   ele é o que vai rodar em produção.
3. Regras que o Drizzle não expressa (gatilhos, restrição adiável, funções)
   vão numa migração escrita à mão: `pnpm --filter @compoze/db exec drizzle-kit generate --custom --name=<nome>`.
4. Rode os testes do banco: `pnpm --filter @compoze/db test`.

A CI falha se o schema TypeScript e as migrações divergirem (ela roda
`drizzle-kit generate` e exige que nada mude).

Migração aplicada não se edita: corrija com uma nova. A exceção registrada é a
`0001`, ajustada à mão antes de ir para a `main` porque o drizzle-kit põe aspas
no tipo `geography(Point, 4326)`.

## O que o banco garante sozinho

Migração `0002_gatilhos.sql`:

| Regra | Como |
| --- | --- |
| `updated_at` é sempre do relógio do servidor; `version` sobe a cada escrita (ADR 0005) | gatilho `compoze_tocar` em toda tabela; o valor enviado pelo cliente é ignorado |
| Reordenar blocos numa transação | `UNIQUE (song_id, position) DEFERRABLE INITIALLY DEFERRED` |
| Pasta sem ciclo | gatilho `compoze_pasta_sem_ciclo` (erro `23514`) |
| Versão registrada é imutável | gatilho `compoze_imutavel` |

E no schema: uma dona por canção (índice único parcial), `bpm` entre 20 e 300,
percentual de coautoria entre 0 e 100, e-mail e @ sem diferenciar maiúsculas
(`citext`), localização nula por padrão (RN11).

## Decisões de modelagem desta fase

- **Ids**: `uuid DEFAULT uuidv7()`, mas o insert aceita o id que vier do
  aparelho (ADR 0005). Testado.
- **Lápide (`deleted_at`)** em pastas, canções, coautores, projetos e faixas.
  Blocos não têm: a partir da Fase 2 eles são uma projeção do documento Yjs, que
  sincroniza por conta própria.
- **Coautor removido e convidado de novo** reaproveita a mesma linha (limpa
  `deleted_at`), por isso `UNIQUE (song_id, user_id)` vale também para linhas
  apagadas. O mesmo para faixa de projeto, cuja chave é `(project_id, song_id)`.
- **Busca**: o índice trigram no título já existe. A coluna `tsvector` com
  `unaccent` fica para a Fase 1, junto com a rota de busca: `unaccent` não é
  imutável e precisa de uma função própria para entrar numa coluna gerada.
- **Contas e sessões** (`sessions`, `accounts`, `verifications`) entram com o
  Better Auth na Fase 1; o schema dele é gerado pela própria biblioteca.

## Testes

```bash
pnpm test                                  # tudo, via Turborepo
pnpm --filter @compoze/db test             # schema, restrições, gatilhos
pnpm --filter @compoze/api test            # rotas com fastify.inject
```

Os testes do backend sobem um PostgreSQL 18 + PostGIS de verdade com
Testcontainers (a mesma imagem do `docker-compose.yml`), aplicam as migrações e
testam contra ele. Precisa de Docker rodando. O primeiro pull da imagem demora;
depois, cada arquivo de teste leva poucos segundos.

## Erros

Toda resposta de erro tem o formato do contrato, `{ "detail": ... }`:

- validação → `422`, com `detail` como lista de `{ campo, mensagem }`;
- erro de domínio → `throw new ErroDaApi(status, "mensagem para a pessoa")`;
- rota inexistente → `404`;
- qualquer outra coisa → `500` com `"Erro interno."`, e o detalhe só no log.
