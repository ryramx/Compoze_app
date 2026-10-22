# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não lançado]

### Adicionado
- Monorepo `Compoze_app` com `apps/web` e `docs/` (ADR 0001).
- Frontend reescrito com o design system "Caderno": papel, tinta e lápis
  vermelho; Newsreader, Hanken Grotesk e IBM Plex Mono; tema claro e escuro
  (ADR 0002).
- Modo demonstração: `VITE_API_URL=demo` roda o app sem backend (ADR 0003).
- Mesa com resumo em frase, "continue de onde parou" com trecho da letra e
  esteira por estágio.
- Índice de canções em tabela ou fichas, busca por título, tag e verso, filtro
  e ordem na URL.
- Editor: ficha técnica na margem, marginália de autoria, alinhar cifra e
  letra, Backspace em bloco vazio, fechar divisão de coautoria (RN05), escolher
  pasta e visibilidade.
- Projetos: capa tipográfica, mudar fase, adicionar/retirar faixas, excluir.
- Pastas: árvore lateral, renomear, excluir, link direto.
- Mapa com rota própria `/map/people` (RN11).
- Busca global (⌘K) em canções, versos, projetos, pastas e pessoas.
- Documentação: visão do produto, arquitetura e design system do front,
  contrato da API, plano do backend, ADRs.
- CI do frontend (lint, typecheck, testes, build).
- ADR 0005: app instalável (PWA, depois Capacitor nas lojas) e uso offline
  local-first; plano do backend reorganizado em quatro fases.
- Stack do backend aceita (ADR 0004).
- Plano do backend fixa PostgreSQL 18 (versão do ambiente local), com `uuidv7()` nativo.
- Backend, Fase 0: Turborepo; `packages/contracts` (Zod); `packages/db` com o
  schema v1 completo, colunas de sincronização e gatilhos (versão e relógio do
  servidor, pasta sem ciclo, versão registrada imutável); `apps/api` com
  Fastify 5, `GET /health`, OpenAPI em `/docs` e erros no formato `{detail}`;
  Docker Compose com PostgreSQL 18 + PostGIS; testes contra Postgres real
  (Testcontainers) e job de CI da API.

- Staging: API e front no Render (`render.yaml`), banco PostgreSQL 18 no
  Neon (grátis), deploy automático após a CI passar.

- Backend, Fase 1 (MVP do contrato): cadastro, login e refresh rotacionado
  com detecção de reuso e limite de tentativas (ADR 0006); perfil, pessoas e
  mapa (RN11); canções com busca sem acento, blocos, coautoria e divisão
  (RN05), lixeira (RN07) e expurgo diário (RN08); pastas sem ciclo; projetos
  e faixas. Criações aceitam id gerado no aparelho.
- `GET /songs?expand=blocks,collaborators` e `GET /projects` com faixas: o
  front carrega tudo em quatro requisições, em vez de uma por canção e por
  projeto.

### Alterado
- `apps/web` passa a usar os tipos de `@compoze/contracts` (respostas e corpos
  de requisição) em `services/api/dto.ts`; mudança no contrato quebra o
  `typecheck` do front. Bloco sem autora (conta apagada) agora é tipado como
  `authorId: null`.
- Menu lateral e "Ir para" da busca mostram ícones em vez dos números
  `01`–`09`; os cabeçalhos de página também perderam o número.

### Corrigido
- Build no Render: `corepack enable` falha lá (diretório global só leitura);
  o pnpm passa a vir pelo `npx`, na versão fixada.
- Abrir o app em duas abas (ou no StrictMode) não derruba mais a sessão: a
  renovação do token é compartilhada.

### Removido
- Cursores de colaboradores simulados.
- Modal de pré-visualização de canção (o editor abre direto).
- Fotos de banco de imagens em perfis, projetos e mural.
- Dependências não usadas do protótipo (shadcn completo, recharts,
  framer-motion, react-hook-form, lovable-tagger).
