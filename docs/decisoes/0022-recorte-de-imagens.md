# 0022 · Janela de recorte para foto e capas, e capa do perfil sempre em 3:1

- Status: aceita
- Data: 2026-10-26
- Relacionadas: [0015](0015-imagens-no-postgres.md) (imagens), [0021](0021-ajustes-do-primeiro-teste.md) (capa do perfil)

## Contexto

O Ryan pediu (2026-10-26) uma janela para recortar a foto de perfil e a capa
antes de subir, porque "a capa não estava aceitando imagens". Investigando:

1. **A capa subia, mas não aparecia.** No próprio perfil, a página mostra os
   dados que vêm de `GET /profiles/{username}` (React Query, ADR 0013), que
   têm precedência sobre o caderno local. Trocar a capa atualizava o caderno,
   mas ninguém invalidava a consulta do perfil: a capa nova só aparecia ao
   recarregar a página. Em Ajustes, que lê do caderno, ela aparecia. Não havia
   recusa no servidor (nem de tipo, nem de tamanho, nem de proporção).
2. **A foto aparecia cortada sem controle.** A capa era mostrada com
   `object-cover` em 5:2 no celular e 4:1 no computador. Uma foto em pé
   perdia quase tudo, e o corte mudava de um aparelho para o outro.

## Decisão

- **Invalidar o perfil** (`["perfil"]`) depois de trocar a foto ou a capa do
  perfil.
- **Janela de recorte** (`components/compoze/Recortar.tsx`) entre o seletor
  de arquivo e o envio, nos três lugares: foto (círculo, 1:1), capa do perfil
  (3:1) e capa de projeto (1:1). A moldura fica parada e a foto anda por
  baixo: arrastar posiciona; o controle, a roda do mouse ou a pinça aproximam
  (até 4×); setas e `+`/`-` funcionam no teclado. A moldura nunca mostra
  vazio: o centro é empurrado para dentro da foto (`areaDoRecorte`, testada).
- **O recorte é feito no aparelho**, no mesmo passo que já reduzia a imagem
  (`recortarImagem` em `lib/imagens.ts`, que substitui `reduzirImagem`). O
  servidor não muda: continua recebendo JPEG/PNG/WebP de até 2 MB.
- **Capa do perfil sempre em 3:1** (`CAPA_DO_PERFIL_PROPORCAO`), no celular e
  no computador, para o corte escolhido ser o corte mostrado. Sai em
  1600×533 px.

Sem biblioteca de recorte: o componente tem pouco mais de cem linhas e segue o
design "Caderno" (véu de papel sobre o que fica fora, borda fina, botões de
canto reto), em vez do visual pronto de uma dependência.

## Consequências

- Escolher uma imagem passa a ter um passo a mais (confirmar o recorte).
  Cancelar a janela não envia nada.
- No celular, a capa do perfil ficou um pouco mais baixa (3:1 em vez de 5:2).
- Capas já enviadas continuam valendo; as que não forem 3:1 seguem mostradas
  com `object-cover`.
