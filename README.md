# Compoze

O caderno compartilhado de quem compõe. Letra, cifra e coautoria no mesmo
lugar: cada trecho guarda quem o escreveu, a divisão de autoria é acertada
dentro da própria canção, e as obras seguem um fluxo da ideia à gravação.

Este repositório reúne todo o produto. O antigo `Compoze-Frontend` foi
descontinuado e o frontend foi refeito aqui (ver
[ADR 0002](docs/decisoes/0002-reescrita-do-frontend.md)).

## Estrutura

```
apps/
  web/        Frontend — React 19, Vite, Tailwind CSS 4, Zustand
  api/        Backend — Fastify 5, Zod, Drizzle, PostgreSQL 18
packages/
  contracts/  Schemas Zod do contrato da API, usados pelos dois lados
  db/         Schema Drizzle, migrações SQL e conexão
docs/         Produto, arquitetura, design system, backend, decisões (ADRs)
```

## Rodando o frontend

Requisitos: Node 24 (22 também funciona) e pnpm 10.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env   # VITE_API_URL=demo
pnpm dev                                  # http://localhost:5173
```

Com `VITE_API_URL=demo` o app roda inteiro sem backend: um servidor de
demonstração responde às rotas da API dentro do navegador e guarda os dados no
`localStorage` ([ADR 0003](docs/decisoes/0003-modo-demo.md)). Na tela de entrada,
"Entrar como Lara Mendes" abre um caderno de exemplo.

Para apontar para uma API real, troque `VITE_API_URL` pela URL dela.

## Rodando o backend

Requisitos: os mesmos, mais Docker.

```bash
pnpm db:up                                # PostgreSQL 18 + PostGIS
cp apps/api/.env.example apps/api/.env
pnpm dev:api                              # http://localhost:3333 (docs em /docs)
```

Detalhes em [docs/backend/desenvolvimento.md](docs/backend/desenvolvimento.md).

## Comandos

| Comando          | O que faz                                   |
| ---------------- | ------------------------------------------- |
| `pnpm dev`         | Servidor de desenvolvimento do frontend          |
| `pnpm dev:api`     | API em modo watch                                |
| `pnpm db:up`       | Sobe o Postgres local (Docker Compose)           |
| `pnpm db:generate` | Gera migração a partir do schema                 |
| `pnpm db:migrate`  | Aplica migrações pendentes                       |
| `pnpm build`       | Build de produção                                |
| `pnpm test`        | Todos os testes (o backend usa Postgres real)    |
| `pnpm lint`        | ESLint e checagens                               |
| `pnpm typecheck`   | TypeScript sem emitir                            |

Os comandos da raiz rodam pelo Turborepo, em todos os pacotes.

## Documentação

Comece por [docs/README.md](docs/README.md). Atalhos:

- [Visão geral](docs/produto/visao-geral.md): para que o Compoze existe.
- [Telas](docs/telas/README.md): cada tela, como foi feita e por quê.
- [Funcionalidades](docs/produto/funcionalidades.md) e
  [arquitetura](docs/arquitetura.md).
- [Futuro](docs/produto/futuro.md): lojas, assinaturas, Mercado Pago.

## No ar

- Site (staging): https://compoze-web-staging.onrender.com
- App Android: [Compoze.apk](https://github.com/ryramx/Compoze_app/releases/latest/download/Compoze.apk)
