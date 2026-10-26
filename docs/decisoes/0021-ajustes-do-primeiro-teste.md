# 0021 · Ajustes do primeiro teste: faixas numeradas à mão, entradas e custos do projeto, capa do perfil

- Status: aceita
- Data: 2026-10-26
- Relacionadas: [0015](0015-imagens-no-postgres.md) (imagens), [0018](0018-apoio-por-pix.md) (apoio por PIX)

## Contexto

Um amigo do Ryan testou o app e mandou uma lista de melhorias de interface
(2026-10-26). A maior parte é visual: a Esteira sumia no papel, "Na roda"
parecia branco total, as fichas de canção e as capas de projeto ocupavam a
largura inteira do celular, e as publicações do mural não tinham separação.
Quatro pedidos mexem no modelo:

1. definir o número da faixa à mão (cadastrar a faixa 7 sem o sistema
   forçar a 2);
2. registrar entradas de dinheiro no projeto (ex.: R$ 500 de um show);
3. listar os custos de produção item a item (cachê de músico, locação);
4. foto de capa no perfil, além da foto de avatar.

## Decisão

**Faixas.** `project_songs.track_number` já existia e o `POST` já aceitava o
número; faltava a tela e a edição. O número escolhido pode pular, mas não
repetir: `POST` com número ocupado dá `409`, e o novo
`PATCH /projects/{id}/songs/{song_id}` troca as duas faixas quando o número
está ocupado, que é o gesto de reordenar. Sem índice único no banco: a troca
acontece numa transação com o projeto travado (`FOR UPDATE`), e um índice
único parcial não pode ser adiado para o fim da transação. A tela usa o mesmo
algoritmo no aparelho (`lib/faixas.ts`) e manda o pedido pela fila offline. O
número também aparece e muda na ficha da canção, no editor.

**Entradas e custos.** Tabela nova `project_entries` (migração 0015): um
livro-caixa com `kind` `ENTRADA` ou `CUSTO`, descrição, categoria livre (a
tela sugere as comuns), valor em reais inteiros e data opcional. Entrada soma
em `projects.funding_current` na mesma transação, como o apoio por PIX
confirmado; corrigir o valor ou apagar acerta a soma. Assim o "arrecadado" é
um número só, que junta PIX e o que entrou por fora. Custo não mexe no
arrecadado; a tela compara a soma dos custos com o custo estimado e mostra o
saldo. Uma tabela só, e não duas, porque as duas listas têm o mesmo formato e
a mesma regra de acesso (só a dona).

Como o apoio por PIX, entradas e custos pedem rede: o arrecadado é calculado
no servidor. O aparelho manda um id UUIDv7, e repetir o envio devolve o mesmo
lançamento.

**Capa do perfil.** Coluna `users.cover_url` e rotas `PUT/DELETE
/users/me/cover`, no mesmo esquema da foto (ADR 0015): bytes no Postgres,
tipo pelos bytes, a anterior apagada na troca, imagens soltas expurgadas pelo
job diário. O aparelho reduz para 1600 px no lado maior. Sem capa, o perfil
mostra papel kraft com a pauta de cinco linhas.

**Cores.** Dois papéis novos no design system: `kraft` (a Esteira e a capa
sem foto) e `bege` (o quadro "Na roda"). Não são acentos; o lápis continua
sendo a única cor de destaque.

## Consequências

- A ficha do projeto ganha "Editar projeto" (nome, formato, descrição, data,
  meta e custo estimado), que antes só se definiam na criação.
- `funding_current` deixa de ser só PIX. A tela separa as entradas lançadas
  de "Apoios recebidos" (a diferença).
- Apagar uma entrada nunca deixa o arrecadado negativo (`greatest(..., 0)`).
- Mais uma tabela e uma coluna; nada muda para dados antigos. Cópias do
  aparelho sem `trackNumbers` usam a ordem das faixas como número.
