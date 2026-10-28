# 0024 · Importar e exportar canções

- Status: aceita
- Data: 2026-10-27
- Relacionadas: [0007](0007-documento-yjs-da-cancao.md) (documento Yjs),
  [0005](0005-mobile-e-offline.md) (offline), [0011](0011-app-android-fora-da-loja.md)
  (APK)

## Contexto

O Ryan pediu (2026-10-27) "Importar" e "Exportar" em cada música, completa ou
não. Importar: trazer PDF, Word ou Markdown escritos em outra plataforma,
"respeitando toda a letra e os acordes, tudo o que estiver anotado". Exportar:
PDF e Markdown, e Word "se for possível".

O desafio do importar é a cifra. Quase toda cifra fora do Compoze é escrita
**acima** do verso, com espaços posicionando o acorde na sílaba; outras usam
acordes entre colchetes no meio do verso (`[G]Quando a ci[D]dade`, o jeito do
ChordPro). No Compoze a cifra é um bloco próprio (♯) acima do verso (¶), então
a importação tem de reconhecer o que é linha de acorde e manter o alinhamento.

## Decisão

**1. Tudo no aparelho.** Ler e gerar arquivos acontece no navegador (e no
APK), sem servidor: funciona offline, o arquivo nunca sai do aparelho, e a
API não muda. As bibliotecas pesadas (pdf.js para ler PDF, jsPDF para
gerar) só carregam quando alguém usa a função.

**2. Do arquivo ao texto, do texto aos blocos.** Duas etapas separadas:

- `lib/arquivoDeLetra.ts` tira o texto de cada formato. Word (.docx) e
  LibreOffice (.odt) são zip com XML: abrimos com `fflate` e lemos os
  parágrafos, mantendo espaços e tabulações (é com eles que a cifra se
  alinha). Título e cabeçalhos do Word viram `#`/`##`, citação vira `>`.
  `.doc` antigo é recusado com a orientação de salvar como .docx.
- `lib/pdfParaTexto.ts` lida com o PDF, que não tem linhas nem espaços,
  só pedaços de texto em posições. Os pedaços viram linhas pela altura; os
  vãos viram espaços pela largura média da letra; e **cada acorde vai para a
  letra do verso de baixo que está na mesma posição horizontal**. Com fonte
  proporcional ("m" quase quatro vezes um "i"), contar espaços erraria a
  sílaba; usamos a largura de cada letra da Helvetica como régua, e a
  largura uniforme quando a fonte é monoespaçada. Cabeçalho e rodapé
  repetidos em toda página saem. PDF só de imagem (digitalizado) é recusado
  com explicação: não há OCR.
- `lib/importar.ts` monta os blocos a partir do texto: linha só de acordes
  (com barras, `(2x)`, `N.C.`) vira ♯; tablatura também; o verso de baixo
  vira ¶; `[Refrão]`, `REFRÃO:`, `Intro: G D`, `## Ponte` e as diretivas
  ChordPro viram §; `>`, `{comment:}` e `Nota:` viram ※. No topo, título,
  quem compôs e a ficha (`Tom: G`, `BPM`, `Compasso`) vão para a ficha da
  canção; o que não tem campo (capotraste, afinação, artista) vira uma nota,
  para nada anotado se perder.

**3. A pessoa confere antes.** O diálogo mostra a prévia no desenho da
folha, com a contagem ("3 seções · 7 cifras · 6 versos · 1 nota") e o tom.
Em PDF, um aviso pede para conferir a posição dos acordes. Dá também para
**colar o texto** (de um site de cifras, do bloco de notas).

**4. Onde fica.** Em **Canções**, "Importar" cria uma canção nova (estágio
Ideia). No **editor**, `…` → "Importar…" põe na canção aberta: numa folha
vazia, ocupa o lugar dela; com texto, a pessoa escolhe "Acrescentar no fim"
ou "Substituir a folha". É uma transação Yjs só, com a origem do editor:
um Ctrl+Z desfaz a importação inteira. A ficha só recebe o que está vazio.
Importando cifra, o editor liga o **Alinhar** (letra monoespaçada), senão o
acorde não cai na sílaba.

**5. Exportar sai de um roteiro só.** `lib/exportar.ts` transforma os blocos
num roteiro (seções; cifra, verso, pausa entre estrofes, nota) e os três
formatos escrevem o mesmo roteiro, com as opções Cifras, Notas e Ficha:

- **Markdown**: seção com cifra vai num bloco de código, o único jeito de o
  Markdown manter os espaços do alinhamento; verso sem cifra usa quebra de
  linha dura. Volta para o Compoze sem perder nada (há teste de ida e
  volta).
- **Word (.docx)**: montado à mão (um zip com XML, ~100 linhas), com estilos
  nomeados (Cifra, Letra alinhada, Nota, Heading 2) e Courier New para cifra
  e letra alinhada, que todo Word, Google Docs e LibreOffice têm. Uma
  biblioteca de Word inteira pesaria mais que o editor.
- **PDF**: jsPDF com as fontes-padrão do PDF (Times, Courier, Helvetica), em
  A4: título em serifa, seção em versalete com régua fina, cifra em lápis
  vermelho, nota com fio tracejado e "Nota:". Cifra e letra alinhada nunca
  quebram linha: a fonte diminui até a linha mais longa caber. A cifra desce
  de página junto com o verso dela.

**6. Entregar o arquivo.** No navegador, download comum. No APK, a WebView
não baixa arquivos: o arquivo vai para o cache do app (`@capacitor/filesystem`)
e abre a folha de compartilhar do Android (`@capacitor/share`), de onde se
salva em Arquivos, no Drive ou se manda pelo WhatsApp.

## Alternativas descartadas

- **Converter no servidor** (LibreOffice, pandoc): pediria internet, um
  serviço pesado no Render e mandar o arquivo da pessoa para fora do
  aparelho.
- **`mammoth`/`docx` para Word**: ler e escrever .docx é pouco XML; as
  bibliotecas somariam centenas de KB para usar uma fração.
- **Imprimir a página (window.print) para PDF**: não funciona na WebView do
  APK e depende do navegador.
- **Exportar PDF com a Newsreader embutida**: ficaria mais fiel ao Caderno,
  mas o jsPDF pede TTF (temos woff2) e a fonte pesaria no arquivo. As fontes
  padrão bastam para imprimir e acentuam bem o português.

## Consequências

- Formatos aceitos: PDF com texto, .docx, .odt, .md, .txt e ChordPro
  (.cho, .chopro, .chordpro, .crd), até 15 MB. O pdf.js entra no pacote
  offline da PWA (`*.mjs` no precache).
- Limites conhecidos: PDF em duas colunas sai com as colunas misturadas;
  acorde em PDF é posição estimada (por isso o aviso); um verso com cifra que
  passa da largura do celular quebra no editor e desalinha até a tela ficar
  mais larga (no PDF e no Word isso não acontece).
- Estrofes com cifra viram blocos separados (um ♯ e um ¶ por linha), como as
  canções escritas no próprio Compoze; o espaço entre estrofes dentro de uma
  seção não é guardado, porque o documento não tem esse conceito.
