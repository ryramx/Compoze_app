# Design system — "Caderno"

## A ideia

Interfaces geradas hoje se parecem: gradiente roxo, cartões com sombra e canto
arredondado, botões em pílula, ícone em cada título, Inter em tudo. O Compoze
parte de outro lugar — do material de quem compõe: **papel, tinta e o lápis
vermelho de quem revisa**.

Princípios:

1. **Tipografia antes de decoração.** Hierarquia por tamanho, peso e família,
   não por caixas coloridas.
2. **Uma cor de acento só.** O vermelho do lápis marca o que está ativo, o
   estágio atual e as cifras. Todo o resto é tinta sobre papel.
3. **Réguas no lugar de sombras.** Linhas finas separam e organizam. Sombra só
   no que de fato flutua (diálogos, a barra de inserir).
4. **A obra em serifa, a ferramenta em grotesca.** Títulos, letras e citações
   usam Newsreader; controles e rótulos usam Hanken Grotesk; números e cifras,
   IBM Plex Mono.
5. **O produto se explica.** A tela de entrada mostra um trecho de canção como
   no editor, em vez de uma ilustração genérica.

## Tokens

Definidos em `apps/web/src/index.css` como variáveis CSS e expostos ao
Tailwind via `@theme`.

| Token | Papel (claro) | Noite (escuro) | Uso |
| --- | --- | --- | --- |
| `papel` | `#f3efe6` | `#151412` | Fundo |
| `papel-2` | `#ebe6da` | `#1b1a17` | Hover, áreas recuadas |
| `folha` | `#faf8f3` | `#1f1e1a` | Superfícies elevadas (diálogos, cartões) |
| `tinta` | `#1c1b18` | `#ece6d9` | Texto principal, botão principal |
| `tinta-2` | `#57534a` | `#ada697` | Texto secundário |
| `tinta-3` | `#8a8578` | `#7c766a` | Rótulos, metadados |
| `linha` / `linha-forte` | `#dbd4c5` / `#b9b09d` | `#2e2c27` / `#4a463d` | Réguas, bordas |
| `lapis` | `#b4412b` | `#e2694f` | Acento único |
| `kraft` / `kraft-linha` | `#e4d9c2` / `#cbbd9f` | `#27241d` / `#3b362b` | Papel pardo: a Esteira da Mesa e a capa de perfil sem foto (ADR 0021) |
| `bege` | `#f7f0e1` | `#1d1b17` | Fundo de quadro mais quente que a folha: "Na roda" (ADR 0021) |
| `autor-1…5` | índigo, oliva, ocre, ameixa, petróleo | versões claras | Cor de cada coautor |

`kraft` e `bege` não são acentos: são outros papéis. O kraft dá à Esteira um
cartão pardo que não some no branco, e o bege tira o quadro "Na roda" do
branco total. O lápis continua sendo a única cor de destaque; na Esteira ele só
marca, com um traço curto, os estágios que têm obra.

Publicações do mural ficam cada uma num cartão `folha` com régua `linha`, para
separar quem disse o quê sem precisar de sombra. Fichas de canção e capas de
projeto vão em grade de duas colunas já no celular (três ou quatro no
computador).

As cores de autor são dessaturadas de propósito: precisam conviver no mesmo
texto sem virar arco-íris. A cor de cada pessoa é derivada do id dela.

Um grão de papel quase invisível (3,5%) cobre o fundo para tirar a cara de tela
chapada.

## Tipografia

| Família | Onde | Por quê |
| --- | --- | --- |
| Newsreader (variável, com eixo óptico) | Títulos, letras, citações, estados vazios | Serifa editorial com eixo `opsz`: o mesmo desenho fica delicado em 56px e legível em 16px |
| Hanken Grotesk (variável) | Interface | Grotesca neutra, menos onipresente que Inter |
| IBM Plex Mono | Cifras, números, índices | Monoespaçada com caráter de máquina de escrever; alinha acordes |

Utilitários próprios: `rotulo` (versalete 10.5px espaçado), `numeral`
(mono tabular), `titulo-pagina`, `link-sublinhado`.

## Componentes de assinatura

- **Navegação com ícones.** Cada seção tem um ícone de traço fino (lucide,
  `strokeWidth` 1.5) em cinza; na seção atual ele fica vermelho, ao lado do
  traço vertical. Os mesmos ícones aparecem em "Ir para", na busca. (Até
  2026-10-22 a navegação era um sumário numerado, `01 Mesa`, `02 Canções`…)
- **Marcador de estágio.** Seis traços crescentes, preenchidos até onde a obra
  chegou, com o atual em vermelho. Mostra posição no fluxo, não só um nome.
- **Monograma.** Iniciais em serifa itálica sobre a cor de autor. Sem foto de
  banco de imagens.
- **Capa tipográfica.** Projeto sem arte ganha capa feita de nome, pauta e ano,
  em papel tingido. Tudo em `cqw`, então a mesma composição serve em 64px e em
  480px.
- **Marginália de autoria.** No editor, o trecho de outra pessoa tem um fio na
  cor dela e o nome na margem.
- **Campos de linha.** Entradas só com a régua de baixo, como numa ficha
  preenchida à mão.
- **Primeiros passos e ajuda.** O tour é uma sequência de folhas, com o
  progresso numa pauta de fios (o atual em vermelho) e cada folha explicada por
  um pedaço do produto. A ajuda é uma folha lateral: título em serifa, resumo
  em itálico e itens separados por réguas. Texto em `lib/ajuda.ts` (ADR 0020).
- **Botões retos.** Canto de 2px. A pílula é a marca mais reconhecível de
  interface gerada.

## Movimento

Pouco e curto: entrada de página com 6px de deslocamento, diálogos que sobem
8px, nada que pule. `prefers-reduced-motion` zera tudo.

## Acessibilidade

- Foco visível com contorno vermelho de 1.5px em todos os controles.
- Contraste de `tinta-2` sobre `papel` acima de 7:1; `tinta-3` é usado só em
  rótulos e metadados.
- Diálogos, menus e dicas usam Radix (foco preso, Esc, leitores de tela).
- O marcador de estágio tem texto alternativo; ícones têm `aria-label`.
