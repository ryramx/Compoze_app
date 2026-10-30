# 0025 · Exportar em HTML e várias canções de uma vez

- Status: aceita
- Data: 2026-10-29
- Relacionadas: [0024](0024-importar-e-exportar.md) (importar e exportar),
  [0005](0005-mobile-e-offline.md) (offline)

## Contexto

Depois do [ADR 0024](0024-importar-e-exportar.md), o Ryan pediu (2026-10-29)
mais duas coisas: exportar "também páginas no modelo .html" e "exportar várias
páginas ao mesmo tempo, algum número que não vá derrubar o servidor". As
"páginas" são as canções.

O servidor de staging é gratuito (Render + Neon), acorda devagar e tem pouca
folga. O risco de um lote não está em gerar os arquivos, que já acontece no
aparelho, e sim em buscar o texto de muitas canções de uma vez.

## Decisão

**1. HTML é o quarto formato** (`paraHtml` em `lib/exportar.ts`), saindo do
mesmo roteiro dos outros três. É uma página só, sem script e sem nada de
fora: o CSS do Caderno vai embutido (papel, tinta, lápis vermelho, régua
fina, tema escuro pelo sistema), com Newsreader e IBM Plex Mono quando a
pessoa as tiver, e Georgia e Courier no lugar delas. A seção com cifra vai
num `<pre>` com a cifra em `<b>`, o que mantém o alinhamento. Na impressão,
o fundo fica branco e o rodapé some. Todo texto é escapado.

**2. A importação lê HTML** (`textoDoHtml` em `lib/arquivoDeLetra.ts`): `h1`
vira título, `h2`–`h6` seção, `pre` cifra alinhada e `blockquote` nota.
Menu, rodapé, script e formulário ficam de fora. Assim o HTML do Compoze
volta sem perda (há teste de ida e volta), e uma página de letra salva de um
site também entra.

**3. Várias de uma vez, num .zip** (`lib/exportarVarias.ts`). Em Canções,
"Selecionar" põe uma caixinha em cada linha (e em cada ficha). Com ela,
tocar numa canção marca em vez de abrir. Uma barra embaixo mostra "6 de 50",
"Marcar as da lista" (o filtro e a busca valem), "Limpar" e "Exportar". O
diálogo é o mesmo do editor. Sai um .zip com um arquivo por canção, na ordem
da lista, e títulos iguais viram "Rua.pdf" e "Rua (2).pdf". O menu `…` de
cada linha também ganhou "Exportar…", para uma canção sem abrir o editor.

**4. O que segura o servidor:**

- Os arquivos continuam sendo gerados **no aparelho**.
- O texto de cada canção vem de onde estiver mais à mão. Primeiro, a cópia
  do documento Yjs no aparelho, que é a mais fiel porque inclui o que ainda
  não subiu. Depois, os blocos que a tela já tem. **Só então** o servidor
  (`GET /songs/:id`). Antes de abrir a cópia local, o app confere se ela
  existe (`indexedDB.databases()`), para não criar uma vazia à toa.
- No máximo **3 pedidos ao mesmo tempo** ao servidor.
- No máximo **50 canções por exportação**. Isso protege o servidor e também o
  celular, que guarda na memória um PDF por canção e o zip. A seleção não
  passa de 50, e "Marcar as da lista" marca as 50 primeiras e avisa.
- PDF e Word já vêm comprimidos e entram no zip sem comprimir de novo, o que
  poupa bateria.
- A canção que não carrega (sem internet e sem cópia no aparelho) fica de
  fora. O aviso diz quais foram, e o resto sai normalmente.

## Alternativas descartadas

- **Gerar o zip no servidor:** pediria CPU e memória do plano gratuito e
  mais um endpoint, e deixaria de funcionar offline.
- **Baixar um arquivo por canção, sem zip:** o navegador pede permissão
  para vários downloads, e no Android abriria a folha de compartilhar 50
  vezes.
- **Teto maior (100, 200):** o caderno de hoje tem dezenas de canções.
  Com 50, uma exportação fica em segundos mesmo buscando tudo do servidor
  (3 por vez). Subir o teto é mudar uma constante, se fizer falta.

## Consequências

- O nome do zip vai sem acento ("Compoze - 6 cancoes.zip"): no teste, o
  Chromium trocou um nome com "ç" por "download". Os arquivos de dentro
  levam o título como está.
- Sem internet, só entram no lote as canções já abertas no aparelho (ou cujo
  texto a tela já tem), e o diálogo avisa isso.
