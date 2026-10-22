# 0004 · Stack do backend

- Status: **proposta** — aguardando confirmação
- Data: 2026-10-22

## Contexto

O backend será escrito do zero; qualquer código anterior é desconsiderado. A
única exigência é PostgreSQL. As necessidades do produto (dados relacionais com
regras de integridade, edição colaborativa em tempo real, prova de autoria,
busca em português, geografia, jobs) estão em `docs/backend/plano.md`, seção 1.

## Decisão proposta

TypeScript de ponta a ponta: **Node 24 + Fastify 5 + Zod (contratos
compartilhados) + Drizzle ORM + PostgreSQL 17 (pg_trgm, unaccent, citext,
PostGIS) + Better Auth + Yjs/Hocuspocus + pg-boss**, testado com Vitest e
Testcontainers, implantado no Render.

## Alternativas consideradas

| Opção | Por que não (agora) |
| --- | --- |
| FastAPI + SQLAlchemy + Alembic | Dois idiomas e tipos duplicados; ecossistema de CRDT é JS. Melhor alternativa se o time preferir Python |
| NestJS | Cerimônia demais para o tamanho do produto |
| Hono | Feito para edge; precisamos de WebSocket longo e Postgres com extensões |
| Prisma | Abstrai o SQL; PostGIS e trigram viram consultas cruas |
| Supabase/Firebase como backend | Regras de negócio espalhadas em políticas e funções |

## Consequências

- Um só toolchain (pnpm, TypeScript, Vitest) para front e back.
- `packages/contracts` substitui, com o tempo, `dto.ts` e boa parte de
  `adapters.ts` no front.
- Hocuspocus roda como serviço separado do REST — dois processos para operar.
- Sem Redis na v1: fila e sessões ficam no Postgres. Se o volume crescer, Redis
  entra para cache e pub/sub do Hocuspocus.
