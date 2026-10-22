# 0002 · Reescrever o frontend com linguagem visual própria

- Status: aceita
- Data: 2026-10-22

## Contexto

O frontend antigo funcionava e já falava com a API, mas a interface era a
estética padrão de app gerado: shadcn/ui sem customização, gradientes, cartões
com sombra, botões em pílula, foto de banco de imagens no topo. O pedido foi um
visual moderno, sóbrio e que não pareça feito por IA.

## Decisão

Reescrever toda a camada de interface em `apps/web` com o design system
"Caderno" (ver `docs/frontend/design-system.md`), e **manter** a camada de
dados, que era boa: `lib/api.ts`, `services/api/*`, `adapters.ts`, os stores e
seus testes foram trazidos quase sem mudança.

Mudanças técnicas junto da reescrita:

- React 18 → 19, Vite 5 → 7, Tailwind 3 → 4 (tokens em CSS), React Router 6 →
  7, TypeScript em modo `strict`.
- Saem ~50 componentes shadcn não usados, `react-hook-form`, `recharts`,
  `framer-motion`, `lovable-tagger`. Entram primitivos próprios sobre Radix.
- Cursores de colaboradores **simulados** foram removidos. Mostrar presença
  falsa é pior do que não mostrar; a presença real vem com a Fase 2 do backend.
- O modal de pré-visualização de canção saiu: clicar numa canção abre o editor,
  que tem modo de leitura (ocultar cifras).
- Fotos de banco de imagens saíram. Pessoas têm monograma; projetos sem arte,
  capa tipográfica.
- O editor ganhou: Backspace em bloco vazio, alinhamento de cifra e letra em
  mono, ficha técnica na margem, fechar divisão de coautoria, pasta e
  visibilidade editáveis.
- Projetos ganharam: mudar fase, adicionar e retirar faixas, excluir.
- Pastas ganharam: renomear e excluir, árvore lateral, link direto por URL.

## Alternativas

- Re-tematizar o shadcn: troca cores, mantém a estrutura reconhecível.
- Biblioteca pronta (Mantine, Chakra): mesmo problema, outra cara.

## Consequências

- Desfazer/refazer cobre texto e metadados, não inserção/remoção de blocos —
  desfazer uma inserção exigiria recriar blocos no servidor com ids novos.
- Mais código de UI próprio para manter, compensado por ter só o que é usado.
