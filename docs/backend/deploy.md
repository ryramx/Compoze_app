# Deploy

O ambiente de staging vive no Render e é descrito em [`render.yaml`](../../render.yaml)
(Blueprint): infraestrutura como código, revisada em PR como o resto.

## O que o Blueprint cria

| Recurso | Tipo | Plano | Para quê |
| --- | --- | --- | --- |
| `compoze-db-staging` | PostgreSQL 18 | `basic-256mb` | Banco (PostGIS e demais extensões são criadas pela migração 0000) |
| `compoze-api-staging` | Web service Node | `free` | API; migra o banco ao subir; health check em `/health` |
| `compoze-web-staging` | Static site | grátis | Front (SPA), com reescrita de rotas para `index.html` |

Tudo na região **Virgínia**, a mais próxima do Brasil entre as do Render, dentro
do projeto `compoze`, ambiente `staging`.

Custo: o banco pago é o único item com cobrança (o plano grátis de banco do
Render expira em 30 dias). A API no plano grátis dorme sem uso e leva alguns
segundos para acordar, o que serve para staging; produção usa `starter` ou maior.

## Primeira vez

1. No Render: **New → Blueprint**, escolher o repositório `Compoze_app`, branch `main`.
2. Conferir a lista de recursos e aplicar.
3. Quando terminar, abrir `https://compoze-api-staging.onrender.com/health`:
   deve responder `"status": "ok"` com a versão 18 do banco.

Se o nome `compoze-web-staging` já estiver em uso no Render, o front ganha outra
URL: ajuste `CORS_ORIGINS` da API para ela.

## Deploys seguintes

`autoDeployTrigger: checksPass`: cada merge na `main` publica sozinho, mas só
depois que a CI passa. O `buildFilter` evita rebuild da API quando só o front
mudou, e vice-versa.

Migrações rodam na subida da API, antes de ela aceitar tráfego. Se uma
migração falhar, a API não sobe e o Render mantém a versão anterior no ar.

## Campos que não mudam depois de criados

`postgresMajorVersion`, `databaseName`, `user` e `region` do banco, e `type` e
`runtime` dos serviços. Mudar qualquer um deles no `render.yaml` exige um
recurso novo (e migrar os dados).

## Até a Fase 1

O front de staging roda com `VITE_API_URL=demo` porque login e canções ainda
não estão na API. Quando estiverem, troca para a URL da API e o modo demo sai
de staging.
