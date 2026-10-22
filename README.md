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
  api/        Backend — ainda não existe; plano em docs/backend/plano.md
docs/         Produto, arquitetura, design system, decisões (ADRs)
```

## Rodando o frontend

Requisitos: Node 22+ e pnpm 10.

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

## Comandos

| Comando          | O que faz                                   |
| ---------------- | ------------------------------------------- |
| `pnpm dev`       | Servidor de desenvolvimento do frontend     |
| `pnpm build`     | Typecheck + build de produção               |
| `pnpm test`      | Testes (Vitest)                             |
| `pnpm lint`      | ESLint                                      |
| `pnpm typecheck` | TypeScript sem emitir                       |

## Documentação

Comece por [docs/README.md](docs/README.md).
