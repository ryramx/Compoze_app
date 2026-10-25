# 0015 · Foto de perfil e capa de projeto guardadas no Postgres

- Status: aceita
- Data: 2026-10-25
- Relacionadas: [0012](0012-memos-de-voz.md) (áudio no Postgres pelo mesmo
  motivo), [0004](0004-stack-do-backend.md) (previa S3/R2 para arquivos)

## Contexto

`users.avatar_url` e `projects.cover_url` existiam desde a Fase 1, mas só
aceitavam uma URL de fora: ninguém conseguia pôr a própria foto. A Fase 4
previa uploads num storage S3 (Cloudflare R2), que pede cartão de crédito.
O Ryan escolheu (2026-10-25) seguir de graça, com as imagens no próprio banco,
como os memos de voz do ADR 0012.

## Decisão

**1. Uma tabela `images` com os bytes.** Dona, tipo, tamanho e `bytea`
(migração 0012). Nada lista imagens, então não vale separar os bytes como nos
memos. `avatar_url` e `cover_url` guardam o caminho `/images/{id}`, relativo à
API; o front monta o endereço com `VITE_API_URL` (`lib/imagens.ts`). Assim o
banco não depende do domínio da API.

**2. O aparelho reduz antes de subir.** Lado maior de 512 px na foto de perfil
e 1200 px na capa, recomprimidas em WebP (JPEG onde o navegador não gera WebP).
Uma foto de celular de 4 MB vira dezenas ou poucas centenas de KB. O servidor
recusa acima de 2 MB.

**3. O tipo sai dos bytes, não do cabeçalho.** Só JPEG, PNG e WebP, conferidos
pelos primeiros bytes. Como a leitura é pública, servir como imagem algo que
não é (HTML, SVG com script) seria uma porta para abuso.

**4. Leitura pública e eterna: `GET /images/{id}`.** Um `<img>` não manda o
token, e foto de perfil é pública por natureza. O id é UUID v7 (74 bits
aleatórios), impossível de adivinhar, e só aparece para quem já vê o perfil
ou o projeto. Trocar a imagem gera outro id, então a resposta vai com
`Cache-Control: immutable` de um ano. O helmet põe
`Cross-Origin-Resource-Policy: same-origin` em tudo; esta rota troca por
`cross-origin`, porque o front mora em outro domínio.

**5. Trocar apaga a antiga na mesma transação.** `PUT` e `DELETE` em
`/users/me/avatar` e `/projects/{id}/cover`. Imagem que fica sem dono por outro
caminho (PATCH com URL de fora, projeto expurgado da lixeira) sai no expurgo
diário, depois de um dia.

**6. Precisa de rede, como o lado social.** A imagem não entra na fila do
aparelho (ADR 0008): sem rede, o botão avisa e nada muda.

## Alternativas

- **Cloudflare R2.** Melhor quando o volume crescer (CDN, sem custo de saída,
  URL pré-assinada), mas pede cartão. A troca depois mexe só em
  `modules/imagens`: as colunas continuam sendo URL.
- **Base64 dentro de `avatar_url`.** Sem rota nova, mas cada lista de pessoas
  carregaria as fotos junto, e o perfil público ficaria enorme.
- **Recortar no aparelho com uma tela de corte.** Fica para quando alguém
  pedir; por ora a capa mostra o centro da imagem (`object-cover`).

## Consequências

- O Neon grátis tem 0,5 GB, dividido com os memos. Com a redução, mil fotos de
  perfil cabem em uns 50 MB.
- A imagem passa pela API a cada primeiro acesso de um navegador; depois, vem
  do cache. Com muito tráfego, é a hora do R2 ou de uma CDN na frente.
- No modo demonstração a imagem reduzida vira `data:` dentro do próprio
  registro, no `localStorage`.
