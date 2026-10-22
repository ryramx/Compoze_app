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
- Plano do backend fixa PostgreSQL 18 (versão do ambiente local), com `uuidv7()` nativo.

### Removido
- Cursores de colaboradores simulados.
- Modal de pré-visualização de canção (o editor abre direto).
- Fotos de banco de imagens em perfis, projetos e mural.
- Dependências não usadas do protótipo (shadcn completo, recharts,
  framer-motion, react-hook-form, lovable-tagger).
