# 0003 · Servidor de demonstração no navegador

- Status: aceita
- Data: 2026-10-22

## Contexto

O backend vai ser escrito do zero. Sem ele, o frontend novo não abre: o login
falha e nenhuma tela carrega. Precisamos ver, apresentar e testar a interface
agora.

## Decisão

`VITE_API_URL=demo` troca o `fetch` por `src/demo/servidor.ts`, que responde às
mesmas rotas do [contrato](../backend/contrato-da-api.md) dentro do navegador,
no mesmo formato (`snake_case`, `detail` nos erros, 204, 401, 422). Os dados de
exemplo ficam no `localStorage`.

A troca acontece **abaixo** dos services: tokens, `ApiError`, services e
adapters rodam igual ao que rodará contra o servidor real. O módulo é carregado
sob demanda e não entra no pacote quando a URL é real.

## Alternativas

- MSW (Mock Service Worker): mesma ideia com service worker. Mais uma
  dependência e um arquivo em `public/` para algo que cabe num `if`.
- Stores com dados fixos (como era antes da API): as telas funcionariam, mas os
  services e adapters não seriam exercitados, e trocar para a API real
  quebraria coisas que a demo escondia.

## Consequências

- Dá para publicar o front como demonstração pública sem backend.
- O servidor de demonstração vira uma especificação executável do contrato,
  com testes próprios (`servidor.test.ts`). Ele **não** substitui a suíte do
  backend.
- Mudanças no contrato precisam ser feitas também no servidor de demonstração
  enquanto ele existir.
