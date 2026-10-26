# Como o Compoze foi construído

A linha do tempo do projeto, fase por fase, com o que entrou em cada uma, o
pull request e a decisão (ADR) que a explica. Para o detalhe de cada mudança,
veja o [CHANGELOG](../../CHANGELOG.md) e o histórico de PRs no GitHub.

## Antes: o Compoze-Frontend

O Compoze começou como um frontend separado (`ryramx/Compoze-Frontend`, feito
numa ferramenta de geração de apps) que falava com um backend em FastAPI. Ele
já tinha a ideia do produto (canções em blocos, autoria, divisão, estágios,
pastas, projetos, lixeira, mapa) e as regras de negócio com código (RN05, RN07,
RN08, RN11), mas a interface tinha a cara padrão de app gerado, e o backend antigo,
local, foi deixado de lado.

Em 22 de outubro de 2026 foram tomadas três decisões que deram origem a este
repositório:

1. **Tudo num repositório só**, o `Compoze_app`, e o `Compoze-Frontend`
   descontinuado ([ADR 0001](../decisoes/0001-monorepo.md)).
2. **Frontend refeito** com uma linguagem visual própria, sóbria, que não
   parecesse feita por IA, mantendo a camada de dados que era boa
   ([ADR 0002](../decisoes/0002-reescrita-do-frontend.md),
   [design system](../frontend/design-system.md)).
3. **Backend do zero**, com uma única exigência: PostgreSQL
   ([ADR 0004](../decisoes/0004-stack-do-backend.md)).

Logo depois veio a quarta: o Compoze tinha de **instalar no celular e
funcionar offline** ([ADR 0005](../decisoes/0005-mobile-e-offline.md)), o que
moldou toda a arquitetura dali em diante.

## Linha do tempo

| Data | Fase | O que entrou | PR | Decisões |
| --- | --- | --- | --- | --- |
| 22/10 | Reescrita | Monorepo, frontend novo ("Caderno"), modo demonstração, plano do backend | — | 0001, 0002, 0003, 0004, 0005 |
| 22/10 | Fase 0 | Turborepo, `packages/contracts` (Zod), `packages/db` (Drizzle, PostgreSQL 18), API Fastify com `/health` e `/docs` | #1 | 0004 |
| 22/10 | Staging | `render.yaml` (Blueprint), banco no Neon grátis, pnpm via `npx` no Render | #2, #4, #5 | — |
| 22/10 | Fase 1 | Contrato v1 completo na API: autenticação própria, canções, blocos, coautoria, pastas, projetos, lixeira, mapa | #3 | 0006 |
| 22/10 | Fase 2a | Canção como documento Yjs; edição em tempo real com Hocuspocus; ícones no menu; front tipado pelo `@compoze/contracts` | #6 | 0007 |
| 23/10 | Fase 2b | Escrever offline: fila no aparelho com `Idempotency-Key`, cópia local, ids UUIDv7 | #7 | 0008 |
| 23/10 | Fase 2c | PWA: instala, abre sem rede, aviso de versão nova | #8 | — |
| 23/10 | Fase 2d | Histórico de versões com hash encadeado e registro da obra | #9 | 0009 |
| 23/10 | Fase 2d | Convites pela conta (aceitar/recusar) e por link de uso único | #10 | 0010 |
| 23/10 | — | Abrir o app sem esperar a API do Render acordar | #11 | — |
| 23–25/10 | Fase 3 | App Android pelo Capacitor, APK assinado nos Releases do GitHub | #12, #13 | 0011 |
| 25/10 | Fases 3b–4b | Compartilhar para o Compoze; aviso de versão do APK; memos de voz; seguir e mural; conversas ao vivo | #14 | 0012, 0013, 0014 |
| 25/10 | Fase 4c | Foto de perfil e capa de projeto no Postgres | #15 | 0015 |
| 25–26/10 | Pendências | Avisos por push (Web Push e Firebase), e-mail pelo Gmail, apoio por PIX direto na chave | #16 | 0016, 0017, 0018 |
| 25/10 | — | Busca do topo acha qualquer pessoa | #17 | — |
| 25/10 | — | Entrar com a API dormindo: acorda ao abrir e explica a espera | #18 | — |
| 25/10 | — | Ajustes → Senha, sem pedir a atual | #19 | 0019 |
| 26/10 | — | Push no celular com o app em segundo plano; seguidor novo avisa; permissão pedida ao abrir | #20 | 0016 |
| 26/10 | — | Lista de seguidores e seguindo, com Mensagem e Seguir de volta | #21 | 0013 |
| 26/10 | — | Primeiros passos no primeiro acesso e ajuda em cada tela | #22 | 0020 |
| 26/10 | — | Documentação completa: uma página por tela, funcionalidades, arquitetura, futuro | #23 | — |
| 26/10 | — | Ajustes do primeiro teste: faixa numerada à mão, editar projeto, entradas e custos, capa do perfil, Esteira em kraft, fichas e projetos em duas colunas, mural em cartões | #24 | 0021 |

Versões do APK publicadas: v0.1.x (primeiras), **v0.2.0** (push ligado pelo
Firebase) e **v0.2.1** (PRs #17 a #21).

## O que guiou a ordem

- **Primeiro o que é do caderno, depois o que é de gente.** Escrever, escrever
  junto e escrever offline vieram antes de mural e conversas, porque são o
  motivo de alguém usar o Compoze.
- **Nada que pedisse cartão de crédito.** Cada vez que o caminho padrão
  custava dinheiro (armazenamento de arquivos, domínio para e-mail, gateway de
  pagamento, conta nas lojas), foi escolhida uma alternativa grátis e a
  decisão foi registrada, com o que muda quando houver orçamento.
- **Documentar junto.** Cada fase entrou com o seu ADR, o CHANGELOG e a
  documentação técnica no mesmo PR.

## Quem fez

Projeto de **Ryan Ramos** ([@ryramx](https://github.com/ryramx)), com o código
escrito em par com o Claude (Anthropic) a partir das decisões tomadas nas
conversas do projeto. Os PRs trazem a autoria de cada mudança.
