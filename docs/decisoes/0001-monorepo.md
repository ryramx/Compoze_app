# 0001 · Um repositório para todo o produto

- Status: aceita
- Data: 2026-10-22

## Contexto

O Compoze estava dividido entre `Compoze-Frontend` (React gerado no Lovable) e
`Compoze_app` (vazio). O backend antigo, citado no código do front, não estava
em nenhum dos dois. Front e back compartilham um contrato extenso, e manter os
dois lados em repositórios separados já tinha produzido uma camada inteira de
tradução (`adapters.ts`) para divergências entre eles.

## Decisão

Todo o produto vive em `ryramx/Compoze_app`, como monorepo pnpm:
`apps/web`, `apps/api` (a criar), `packages/*` para código compartilhado e
`docs/` para documentação. O `Compoze-Frontend` é descontinuado.

## Alternativas

- Manter dois repositórios: exige versionar e publicar o contrato entre eles;
  cada mudança de API vira dois PRs coordenados.
- Monorepo com Nx: mais poder, mais configuração. pnpm workspaces (e Turborepo
  quando houver mais de um app) bastam.

## Consequências

- Uma mudança de contrato é um PR só, com front e back juntos.
- Schemas compartilhados (`packages/contracts`) passam a ser possíveis.
- O CI precisa rodar só o que mudou — resolvido com filtros do pnpm/Turborepo.
