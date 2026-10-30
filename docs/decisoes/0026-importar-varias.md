# 0026 · Importar várias canções de uma vez

- Status: aceita
- Data: 2026-10-30
- Relacionadas: [0024](0024-importar-e-exportar.md) (importar e exportar),
  [0025](0025-html-e-exportar-varias.md) (HTML e exportar várias)

## Contexto

Quando pediu "várias de uma vez" ([ADR 0025](0025-html-e-exportar-varias.md)),
o Ryan queria dizer **importar** (2026-10-30): "quero que o sistema importe
várias canções em .html, e para cada arquivo ele crie uma canção nova". A
exportação em lote, que já estava pronta, continua.

## Decisão

- Em **Canções**, o Importar aceita vários arquivos de uma vez, escolhidos ou
  arrastados, em qualquer formato que a importação lê (HTML, PDF, Word,
  Markdown, texto, ChordPro). **Cada arquivo vira uma canção nova**, como
  ideia. Um arquivo só segue o caminho de antes, com a prévia inteira e o
  título editável.
- A janela lista os arquivos enquanto lê, **um por vez** (um PDF pesa no
  celular). Cada linha mostra o título encontrado, o nome do arquivo e o
  resumo ("2 seções · 1 cifra · 2 versos"), com **Ver** para abrir a prévia.
  O que não é letra (uma imagem, um PDF escaneado) aparece com o motivo e
  fica de fora. Desmarcar tira a canção do lote. O botão diz quantas serão
  criadas ("Criar 6 canções").
- No máximo **50 arquivos por vez**, o mesmo teto da exportação. Se vierem
  mais, entram os 50 primeiros e a janela avisa quantos ficaram para depois.
- Criar não pesa no servidor: cada canção nasce no aparelho (ADR 0008) e os
  pedidos entram na fila, que fala com o servidor um por vez e funciona
  offline. A tela continua em Canções, com o aviso "6 canções importadas
  como ideia".
- No editor, Importar continua aceitando um arquivo, porque ali o destino é
  a canção aberta.

## Consequências

- Um arquivo com várias canções dentro continua virando uma canção só.
  Separar por título dentro do mesmo arquivo fica para depois, se fizer
  falta.
