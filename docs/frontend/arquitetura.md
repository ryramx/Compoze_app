# Arquitetura do frontend

`apps/web` — React 19 + Vite 7 + TypeScript (strict) + Tailwind CSS 4.

## Camadas

```
pages/            Telas. Leem do store e chamam ações; não conhecem HTTP.
components/
  ui/             Primitivos sem domínio: Botao, Campo, Dialogo, Menu, Dica.
  compoze/        Peças do domínio: Monograma, Estagio, Capa, BuscaGlobal…
  editor/         Bloco e Ficha técnica do editor de canções.
  layout/         Casca do app (trilho de navegação, abas no celular).
store/            Zustand. compozeStore guarda o conjunto de trabalho;
                  authStore guarda a sessão.
services/api/     Uma função por rota. Recebe e devolve tipos de domínio.
  dto.ts          Tipos exatamente como a API os envia (snake_case).
  adapters.ts     Único lugar que traduz DTO ⇄ domínio.
services/mock/    Funções puras sobre listas (filtros, lixeira) e as partes
                  sociais que ainda não têm backend.
lib/api.ts        Transporte: fetch, token, erros (ApiError), modo demo.
demo/             Servidor de demonstração (ADR 0003).
types/            Tipos de domínio usados pelas telas.
```

A regra é que o formato da API não vaze para as telas. Se a API mudar um nome
de campo, muda `dto.ts` e `adapters.ts`, e nenhuma tela.

## Estado

O `compozeStore` carrega, ao entrar, tudo o que a pessoa tem: canções (com
blocos), lixeira, pastas, projetos e as pessoas citadas. As telas leem dele de
forma síncrona, o que importa porque `getUser` aparece em quase todo
componente.

Escritas são **otimistas e adiadas**: o estado local muda na hora e a gravação
vai ao servidor 600 ms depois da última tecla, por chave (`song:id`,
`block:id`…). Uma falha recarrega do servidor.

TanStack Query é usado onde o dado não pertence ao conjunto de trabalho (ex.:
pessoas no mapa).

Duas cargas extras existem porque o contrato atual não as evita: a listagem de
canções não traz blocos e a de projetos não traz faixas, então o store busca o
detalhe de cada item. O contrato do backend novo resolve isso
(`docs/backend/contrato-da-api.md`, "Pendências").

## Rotas

| Rota | Tela |
| --- | --- |
| `/login`, `/cadastro` | Entrada (públicas) |
| `/` | Mesa |
| `/songs` (`?estagio=`, `?q=`) | Índice de canções |
| `/songs/:id/edit` | Editor |
| `/folders` (`?pasta=`) | Pastas |
| `/projects`, `/projects/:id` | Projetos |
| `/feed`, `/messages`, `/map` | Gente |
| `/profile`, `/profile/:username` | Perfil |
| `/trash`, `/settings` | Lixeira, Ajustes |

`RequireAuth` restaura a sessão pelo refresh token e espera a carga inicial
antes de renderizar qualquer tela protegida. As telas, exceto a Mesa, são
carregadas sob demanda (`React.lazy`).

## Editor

- Cada bloco é um `textarea` que cresce com o conteúdo. Enter cria um verso
  abaixo; Backspace num bloco vazio o remove e volta ao anterior.
- Inserção pelo cursor: abaixo do bloco em foco; cifra pedida sobre um verso
  entra acima dele.
- Desfazer/refazer cobre texto e metadados (não inserção/remoção de blocos —
  ver ADR 0002).
- "Alinhar" troca a letra para fonte monoespaçada, para que acorde e sílaba
  coincidam. A preferência fica no navegador.
- A autoria aparece como marginália: fio na cor de quem escreveu e o nome na
  margem no começo de cada trecho.

## Testes

Vitest + Testing Library (`pnpm test`). Cobrem adapters, transporte, store,
desfazer/refazer, guarda de rota e o servidor de demonstração.
