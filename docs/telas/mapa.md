# Mapa

`/map` · `apps/web/src/pages/app/Map.tsx`, rota `GET /map/people`

## Para que serve

"Quem compõe perto de você. Só aparece quem escolheu aparecer." Um jeito de
achar parceria na mesma cidade.

## O que dá para fazer

- Ver as pessoas como **monogramas no mapa**, na cor de autor de cada uma.
- Ver ao lado a **lista por cidade**, da que tem mais gente para a que tem
  menos, com a contagem.
- Clicar numa pessoa (no mapa ou na lista): o mapa voa até ela e aparece um
  cartão com nome, `@`, cidade, bio e "Ver perfil".

## Como foi feita

- Leaflet com `react-leaflet`. Os mapas de fundo são os da CARTO sobre o
  OpenStreetMap, claros (`light_all`) ou escuros (`dark_all`) conforme o tema.
  O marcador é um `divIcon` com o monograma desenhado em HTML.
- As pessoas vêm de `GET /map/people` (React Query, `["mapa"]`). O servidor só
  devolve quem ligou `show_on_map` e tem posição, e nunca o e-mail. A busca
  usa um índice espacial (PostGIS, `gist`), só sobre quem está no mapa.

## Decisões e porquês

| Decisão | Por quê |
| --- | --- |
| Ninguém aparece por padrão (RN11) | Localização é dado sensível. A posição é nula até a pessoa escolher aparecer, e o perfil público nunca manda coordenadas |
| Mapas da CARTO | Grátis para este uso, combinam com o papel e têm versão escura |

## Limite atual

Ajustes ainda não tem a chave "aparecer no mapa" nem um jeito de marcar a
posição: hoje só a conta de exemplo da demonstração aparece. A API já aceita
`show_on_map`, `latitude` e `longitude` em `PATCH /users/me`. Ver
[futuro](../produto/futuro.md).

## Sem internet

O mapa pede internet (as pessoas e os mapas de fundo vêm de fora).
