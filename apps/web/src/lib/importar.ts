import { COMPASSOS, TONS } from "@/lib/rotulos";
import type { SongBlock } from "@/types";

/**
 * Importar uma canção escrita em outro lugar (ADR 0024). Este módulo é a
 * parte que entende o texto: recebe o texto já extraído do arquivo (PDF,
 * Word e afins viram texto em `lib/arquivoDeLetra.ts`) e monta os blocos do
 * Compoze, sem perder letra, cifra nem anotação.
 *
 * Formatos que ele reconhece no mesmo texto:
 *
 * - cifra sobre a letra (o jeito de quase todo site de cifras): uma linha só
 *   de acordes vira bloco de cifra, e o verso de baixo vira o verso dela;
 * - acordes entre colchetes no meio do verso (ChordPro e afins):
 *   `[G]Quando a ci[D]dade dorme` vira uma cifra alinhada sobre o verso;
 * - diretivas ChordPro (`{title:}`, `{key:}`, `{start_of_chorus}`,
 *   `{comment:}`…);
 * - Markdown: `#` título, `##` seção, `>` nota, blocos de código com a cifra;
 * - rótulos de seção soltos (`[Refrão]`, `REFRÃO:`, `Ponte`, `Intro: G D`);
 * - a ficha no cabeçalho (`Tom: G`, `BPM: 92`, `Compasso: 3/4`). O que não
 *   cabe na ficha (capotraste, afinação, composição) vira nota, para nada
 *   anotado se perder.
 */

export type BlocoImportado = Pick<SongBlock, "type" | "text"> & { label?: string };

export interface CancaoImportada {
  titulo: string;
  tom?: string;
  bpm?: number;
  compasso?: string;
  blocos: BlocoImportado[];
}

export type FormatoDeTexto = "texto" | "markdown";

// ------------------------------------------------------------------ acordes

// Acorde: tônica, depois só o que um acorde pode ter (qualidade, extensões,
// alterações entre parênteses, baixo). "Am7(9)", "G7M", "C#m7(b5)", "D/F#",
// "E7(4)", "Bº", "F#m7/E", "Asus4", "Cadd9".
const RESTO_DO_ACORDE =
  /^(?:maj|min|dim|aug|sus|add|m|M|º|°|ø|\+|-|[0-9]|#|b|♯|♭|\((?:[#b♯♭+-]?[0-9]+[,/ ]?)+\))*(?:\/(?:[A-G][#b♯♭]?|[0-9]+))?$/;

/** Uma palavra é um acorde? `(G)` e `G*` também contam (cifra opcional ou anotada). */
export function ehAcorde(palavra: string): boolean {
  const sem = palavra.replace(/\*+$/, "");
  const p = /^\(.*\)$/.test(sem) ? sem.slice(1, -1) : sem;
  const m = /^([A-G])([#b♯♭]?)(.*)$/.exec(p);
  if (!m) return false;
  return RESTO_DO_ACORDE.test(m[3]!);
}

// O que aparece numa linha de cifra além dos acordes: barras de compasso,
// repetições, "N.C." (sem acorde), setas, pontuação solta.
const ENCHIMENTO = /^(?:\|+:?|:?\|+|[-–—/%.~>→]+|\(?[0-9]+x\)?|\(?x[0-9]+\)?|N\.?C\.?|riff|\(|\)|,)$/i;

/** Uma linha só de acordes (e barras, repetições). Precisa de ao menos um acorde. */
export function ehLinhaDeCifra(linha: string): boolean {
  const palavras = linha.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return false;
  let acordes = 0;
  for (const p of palavras) {
    if (ehAcorde(p)) acordes++;
    else if (!ENCHIMENTO.test(p)) return false;
  }
  return acordes > 0;
}

/** Linha de tablatura (`e|---0---|`): fica como cifra, monoespaçada. */
const TABLATURA = /^\s*[A-Ga-g][#b]?\s?\|[-0-9|hpbr/\\~x()\s.^*]+$/;

// ------------------------------------------------------------------ seções

const NOMES_DE_SECAO = [
  "intro", "introdução", "introducao", "verso", "verse", "estrofe", "parte", "primeira parte", "segunda parte",
  "terceira parte", "refrão", "refrao", "chorus", "coro", "pré-refrão", "pre-refrão", "pré refrão", "pre-refrao",
  "prerrefrão", "pré-refrao", "pre-chorus", "prechorus", "ponte", "bridge", "solo", "interlúdio", "interludio",
  "interlude", "final", "outro", "coda", "riff", "tab", "tablatura", "instrumental", "passagem", "tag", "vamp",
  "pós-refrão", "pos-refrão", "post-chorus", "base", "dedilhado", "levada",
];

const SECAO_SOLTA = new RegExp(
  `^(?:${NOMES_DE_SECAO.map((n) => n.replace(/[-]/g, "\\-")).join("|")})(?:\\s+[0-9IVX]+)?(?:\\s*\\(?[0-9]+x\\)?)?$`,
  "i",
);

/**
 * Rótulo de seção no começo da linha, e o que vem depois dele na mesma linha
 * (Cifra Club escreve "[Intro] C G Am F"). `null` quando a linha não é seção.
 */
export function lerSecao(linha: string): { rotulo: string; resto: string } | null {
  const t = linha.trim();
  // [Refrão], [Intro] G D — colchete com algo que não é acorde.
  const colchete = /^\[([^\]]+)\]\s*(.*)$/.exec(t);
  if (colchete && !ehAcorde(colchete[1]!.trim())) {
    return { rotulo: colchete[1]!.trim(), resto: colchete[2]!.trim() };
  }
  // "Refrão:", "Intro: G D Em", "Ponte (2x):"
  const doisPontos = /^([^:]{1,40}):\s*(.*)$/.exec(t);
  if (doisPontos && SECAO_SOLTA.test(doisPontos[1]!.trim())) {
    return { rotulo: doisPontos[1]!.trim(), resto: doisPontos[2]!.trim() };
  }
  // "REFRÃO", "Verso 2", "Solo"
  if (SECAO_SOLTA.test(t)) return { rotulo: t, resto: "" };
  // Rótulo em caixa alta que não está na lista ("PRIMEIRA PARTE B", "FINAL
  // FALADO"): curto, com letras e sem nenhuma minúscula.
  const letras = t.match(/\p{L}/gu)?.length ?? 0;
  if (
    letras >= 3 &&
    !/\p{Ll}/u.test(t) &&
    /^[\p{L}\d\s'’.()-]+$/u.test(t) &&
    t.length <= 40 &&
    t.split(/\s+/).length <= 4 &&
    !ehLinhaDeCifra(t)
  ) {
    return { rotulo: t, resto: "" };
  }
  return null;
}

/** "REFRÃO" → "Refrão"; o que já tem maiúsculas e minúsculas fica como está. */
function rotuloLimpo(r: string): string {
  const t = r.replace(/\s+/g, " ").trim();
  if (t !== t.toUpperCase()) return t;
  return t.charAt(0) + t.slice(1).toLocaleLowerCase("pt-BR");
}

// ------------------------------------------------------------------ ficha

/** `Tom: G`, `BPM: 92`, `Compasso: 3/4`, `Capo: 2ª casa`… `null` se não for. */
const CHAVE_DE_FICHA =
  /^(tom|key|bpm|andamento|tempo|compasso|time|capo|capotraste|afinação|afinacao|tuning|artista|artist|autor|autores|composição|composicao|compositor|compositores|letra|música|musica|álbum|album|ano|estágio|estagio|coautoria)\s*:\s*(.+)$/i;

function normalizarTom(valor: string): string | undefined {
  const m = /^([A-G])([#b♯♭]?)(m(?!aj))?/.exec(valor.trim());
  if (!m) return undefined;
  const tom = `${m[1]}${m[2]!.replace("♯", "#").replace("♭", "b")}${m[3] ? "m" : ""}`;
  return TONS.includes(tom) ? tom : undefined;
}

interface Ficha {
  tom?: string;
  bpm?: number;
  compasso?: string;
  /** O que não tem campo na ficha do Compoze: vira nota. */
  outros: string[];
}

/**
 * Lê uma linha de ficha. A exportação do Compoze junta vários campos com
 * " · " ("Tom: G · Compasso: 4/4 · Andamento: 92 bpm"); cada pedaço conta.
 * Devolve `false` se algum pedaço não for de ficha.
 */
function lerFicha(linha: string, ficha: Ficha): boolean {
  const pedacos = linha.split(/\s+·\s+/).map((p) => p.trim());
  const lidos: [string, string][] = [];
  for (const p of pedacos) {
    const m = CHAVE_DE_FICHA.exec(p);
    if (!m) return false;
    lidos.push([m[1]!.toLowerCase(), m[2]!.trim()]);
  }
  for (const [chave, valor] of lidos) {
    if (chave === "tom" || chave === "key") {
      const tom = normalizarTom(valor);
      if (tom && !ficha.tom) ficha.tom = tom;
      // "Tom: G (forma dos acordes no tom de E)" — o resto é informação.
      if (!tom || valor.trim().length > tom.length) ficha.outros.push(`Tom: ${valor}`);
    } else if (["bpm", "andamento", "tempo"].includes(chave) && /^[0-9]{2,3}\b/.test(valor)) {
      const n = Number(/^[0-9]+/.exec(valor)![0]);
      if (n >= 20 && n <= 400) ficha.bpm ??= n;
    } else if ((chave === "compasso" || chave === "time") && COMPASSOS.includes(valor.replace(/\s/g, ""))) {
      ficha.compasso ??= valor.replace(/\s/g, "");
    } else if (chave === "estágio" || chave === "estagio" || chave === "coautoria") {
      // Vêm da exportação do próprio Compoze e são da canção original: a
      // importada nasce como ideia, só de quem importou.
    } else {
      const rotulo = chave.charAt(0).toUpperCase() + chave.slice(1);
      ficha.outros.push(`${rotulo}: ${valor}`);
    }
  }
  return true;
}

// ------------------------------------------------------------------ ChordPro

const DIRETIVA = /^\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}$/i;

const SECOES_CHORDPRO: Record<string, string> = {
  start_of_chorus: "Refrão",
  soc: "Refrão",
  start_of_verse: "Verso",
  sov: "Verso",
  start_of_bridge: "Ponte",
  sob: "Ponte",
  start_of_tab: "Tablatura",
  sot: "Tablatura",
  start_of_grid: "Grade",
  sog: "Grade",
};

const ACORDE_EM_COLCHETES = /\[([^\]\s]+)\]/g;

/**
 * `[G]Quando a ci[D]dade dorme` → cifra "G           D" sobre "Quando a cidade
 * dorme". Devolve `null` se a linha não tem acordes entre colchetes.
 */
export function separarAcordesDoVerso(linha: string): { cifra: string; verso: string } | null {
  const achados = [...linha.matchAll(ACORDE_EM_COLCHETES)];
  if (achados.length === 0 || !achados.every((a) => ehAcorde(a[1]!))) return null;
  let verso = "";
  let cifra = "";
  let ultimo = 0;
  for (const a of achados) {
    verso += linha.slice(ultimo, a.index);
    ultimo = a.index! + a[0].length;
    // O acorde fica sobre a sílaba onde estava; se colar no anterior, anda
    // para a direita (e o verso não muda).
    const coluna = Math.max(verso.length, cifra.length > 0 ? cifra.length + 1 : 0);
    cifra = cifra.padEnd(coluna) + a[1];
  }
  verso += linha.slice(ultimo);
  return { cifra: cifra.trimEnd(), verso: verso.trimEnd() };
}

// ------------------------------------------------------------------ Markdown

/** Tira o que é marcação de Markdown de uma linha de texto (fora do bloco de código). */
function limparMarkdown(linha: string): string {
  return linha
    .replace(/<!--.*?-->/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[^*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, "$1$2")
    .replace(/(^|[^_\w])_(?!\s)(.+?)(?<!\s)_(?!\w)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\\$/, "")
    .replace(/\\([\\`*_{}[\]()#+\-.!>|~])/g, "$1");
}

// ------------------------------------------------------------------ leitura

/** Linhas que não são da canção: rodapé do PDF do Compoze, número de página. */
const RUIDO = /^(?:.{0,200} · compoze|página\s+[0-9]+(?:\s+de\s+[0-9]+)?|[0-9]+\s*(?:\/|de)\s*[0-9]+)$/i;

const LIMITE_DE_BLOCOS = 2000;

function expandirTabs(linha: string): string {
  let saida = "";
  for (const c of linha) saida += c === "\t" ? " ".repeat(4 - (saida.length % 4)) : c;
  return saida;
}

/** "Trem-das-onze" e "Trem das Onze" são o mesmo título. */
function mesmoTitulo(a: string, b: string): boolean {
  const n = (t: string) => t.normalize("NFD").replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
  return n(a) !== "" && n(a) === n(b);
}

/** Título a partir do nome do arquivo: "minha_cancao-final.pdf" → "minha cancao-final". */
export function tituloDoArquivo(nome: string): string {
  return nome.replace(/\.[a-z0-9]{1,9}$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Monta a canção a partir do texto. `tituloReserva` (o nome do arquivo) vale
 * quando o texto não diz o título.
 */
export function lerCancao(textoBruto: string, formato: FormatoDeTexto, tituloReserva = ""): CancaoImportada {
  const linhas = textoBruto.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(/\u00A0/g, " ").split("\n");
  const ficha: Ficha = { outros: [] };
  const blocos: BlocoImportado[] = [];
  let titulo = "";

  // O verso aberto recebe as próximas linhas de letra até uma linha em
  // branco, uma cifra ou uma seção: a cifra fecha o verso de cima e abre o
  // dela, então cada verso com cifra começa um bloco, como no papel.
  let versoAberto: BlocoImportado | null = null;
  let notaAberta: BlocoImportado | null = null;
  // Antes da primeira seção, cifra ou verso, linhas de ficha são ficha.
  let noCabecalho = true;
  let emCodigo = false;

  const fechar = () => {
    versoAberto = null;
    notaAberta = null;
  };
  const secao = (rotulo: string) => {
    fechar();
    noCabecalho = false;
    blocos.push({ type: "section", label: rotuloLimpo(rotulo), text: "" });
  };
  const cifra = (texto: string) => {
    fechar();
    noCabecalho = false;
    blocos.push({ type: "chord-line", text: texto.trimEnd() });
  };
  const verso = (texto: string) => {
    notaAberta = null;
    noCabecalho = false;
    if (versoAberto) {
      versoAberto.text += `\n${texto}`;
    } else {
      versoAberto = { type: "lyric-line", text: texto };
      blocos.push(versoAberto);
    }
  };
  const nota = (texto: string) => {
    versoAberto = null;
    if (notaAberta) notaAberta.text += `\n${texto}`;
    else {
      notaAberta = { type: "note", text: texto };
      blocos.push(notaAberta);
    }
  };

  // Front matter YAML no Markdown (--- … ---): título e ficha.
  let i = 0;
  if (formato === "markdown" && linhas[0]?.trim() === "---") {
    const fim = linhas.findIndex((l, j) => j > 0 && l.trim() === "---");
    if (fim > 0) {
      for (const l of linhas.slice(1, fim)) {
        const m = /^\s*([a-zA-Zçãéí_]+)\s*:\s*["']?(.*?)["']?\s*$/.exec(l);
        if (!m) continue;
        const [chave, valor] = [m[1]!.toLowerCase(), m[2]!];
        if (chave === "title" || chave === "titulo" || chave === "título") titulo ||= valor;
        else if (valor) lerFicha(`${chave}: ${valor}`, ficha);
      }
      i = fim + 1;
    }
  }

  // Cabeçalho de site de cifras ou de PDF: as linhas do topo, antes de
  // qualquer cifra ou seção, com o título, quem compôs e a ficha ("Trem das
  // Onze / Adoniran Barbosa / Tom: E"). Vai até a última linha de ficha; sem
  // ficha, só o título do arquivo repetido conta. O resto é a primeira estrofe.
  const ehDaCancao = (l: string) =>
    ehLinhaDeCifra(l) || TABLATURA.test(l) || lerSecao(l) !== null || DIRETIVA.test(l) || separarAcordesDoVerso(l) !== null || /^(#|>|```|~~~)/.test(l);
  const topo: { linha: string; indice: number }[] = [];
  for (let j = i; j < linhas.length && topo.length < 8; j++) {
    const l = linhas[j]!.trim();
    if (!l) continue;
    if (ehDaCancao(l)) break;
    topo.push({ linha: l, indice: j });
  }
  let ultimaDeFicha = -1;
  topo.forEach((t, k) => {
    if (lerFicha(t.linha, { outros: [] })) ultimaDeFicha = k;
  });
  const cabecalho =
    ultimaDeFicha >= 0 ? topo.slice(0, ultimaDeFicha + 1) : topo[0] && mesmoTitulo(topo[0].linha, tituloReserva) ? [topo[0]] : [];
  cabecalho.forEach(({ linha }, k) => {
    if (lerFicha(linha, ficha)) return;
    if (k === 0 && !titulo) titulo = linha;
    else if (!(k === 0 && mesmoTitulo(linha, titulo))) ficha.outros.push(linha);
  });
  if (cabecalho.length > 0) i = cabecalho[cabecalho.length - 1]!.indice + 1;

  for (; i < linhas.length && blocos.length < LIMITE_DE_BLOCOS; i++) {
    let linha = expandirTabs(linhas[i]!).trimEnd();

    // ----- Markdown: blocos de código guardam a cifra como está.
    if (formato === "markdown" && /^\s*(```|~~~)/.test(linha)) {
      emCodigo = !emCodigo;
      fechar();
      continue;
    }
    if (formato === "markdown" && !emCodigo) {
      const t = linha.trim();
      const titulo1 = /^#\s+(.+?)\s*#*$/.exec(t);
      if (titulo1 && !titulo && blocos.length === 0) {
        titulo = limparMarkdown(titulo1[1]!);
        continue;
      }
      const cabecalho = /^#{1,6}\s+(.+?)\s*#*$/.exec(t);
      if (cabecalho) {
        secao(limparMarkdown(cabecalho[1]!).replace(/^\[(.*)\]$/, "$1"));
        continue;
      }
      if (/^(?:[-*_]\s*){3,}$/.test(t)) {
        fechar();
        continue;
      }
      const citacao = /^>\s?(.*)$/.exec(t);
      if (citacao) {
        const texto = limparMarkdown(citacao[1]!).replace(/^※\s*/, "");
        if (texto.trim()) nota(texto.trim());
        else notaAberta = null;
        continue;
      }
      linha = limparMarkdown(linha).trimEnd();
    }

    const t = linha.trim();

    if (!t) {
      fechar();
      continue;
    }
    if (RUIDO.test(t)) continue;

    // ----- ChordPro: diretivas.
    if (!emCodigo) {
      const d = DIRETIVA.exec(t);
      if (d) {
        const nome = d[1]!.toLowerCase();
        const valor = (d[2] ?? "").trim();
        if (nome === "title" || nome === "t") titulo ||= valor;
        else if (nome === "subtitle" || nome === "st" || nome === "artist") {
          if (valor) ficha.outros.push(nome === "artist" ? `Artista: ${valor}` : valor);
        } else if (nome === "key") lerFicha(`Tom: ${valor}`, ficha);
        else if (nome === "tempo") lerFicha(`BPM: ${valor}`, ficha);
        else if (nome === "time") lerFicha(`Compasso: ${valor}`, ficha);
        else if (nome === "capo") ficha.outros.push(`Capo: ${valor}`);
        else if (["comment", "c", "comment_italic", "ci", "comment_box", "cb", "highlight"].includes(nome)) {
          if (valor) {
            // "{c: Refrão}" é o jeito comum de nomear seção em ChordPro.
            if (lerSecao(valor)?.resto === "") secao(valor);
            else nota(valor);
          }
        } else if (nome in SECOES_CHORDPRO) {
          secao(valor || SECOES_CHORDPRO[nome]!);
        } else if (nome.startsWith("end_of_") || /^eo[cvbtg]$/.test(nome)) {
          fechar();
        }
        // Outras diretivas (fontes, cores, define) não são da canção.
        continue;
      }
    }

    // ----- "Nota: …" (o PDF do Compoze escreve assim; muita gente também).
    const comoNota = /^(?:nota|obs|observação|observacao)\s*:\s*(.+)$/i.exec(t);
    if (comoNota && !emCodigo) {
      nota(comoNota[1]!);
      continue;
    }

    // ----- Ficha no cabeçalho.
    if (noCabecalho && !emCodigo && lerFicha(t, ficha)) continue;

    // ----- Tablatura e cifra sobre a letra.
    if (TABLATURA.test(linha)) {
      cifra(linha);
      continue;
    }
    if (ehLinhaDeCifra(t)) {
      cifra(linha);
      continue;
    }

    // ----- Rótulo de seção (com ou sem acordes depois).
    if (!emCodigo || /^\s*\[[^\]]+\]/.test(linha)) {
      const s = lerSecao(t);
      if (s) {
        secao(s.rotulo);
        if (s.resto) {
          if (ehLinhaDeCifra(s.resto)) cifra(s.resto);
          else {
            const junto = separarAcordesDoVerso(s.resto);
            if (junto) {
              cifra(junto.cifra);
              verso(junto.verso);
            } else verso(s.resto);
          }
        }
        continue;
      }
    }

    // ----- Acordes entre colchetes no verso.
    const junto = separarAcordesDoVerso(linha);
    if (junto) {
      cifra(junto.cifra);
      if (junto.verso.trim()) verso(junto.verso);
      continue;
    }

    // ----- Letra. O título repetido na primeira linha (comum em PDF e Word)
    // não vira verso.
    if (blocos.length === 0 && mesmoTitulo(t, titulo || tituloReserva)) {
      titulo ||= t;
      continue;
    }
    verso(linha);
  }

  // Indentação comum a todas as cifras e versos (margem do PDF, recuo do
  // Word) sai; a relativa, que alinha acorde e sílaba, fica.
  const alinhaveis = blocos.filter((b) => b.type === "chord-line" || b.type === "lyric-line");
  const recuo = Math.min(
    ...alinhaveis.flatMap((b) => b.text.split("\n").filter((l) => l.trim()).map((l) => /^ */.exec(l)![0].length)),
  );
  if (Number.isFinite(recuo) && recuo > 0) {
    for (const b of alinhaveis) b.text = b.text.split("\n").map((l) => l.slice(Math.min(recuo, /^ */.exec(l)![0].length))).join("\n");
  }

  if (ficha.outros.length > 0) blocos.unshift({ type: "note", text: ficha.outros.join("\n") });

  return {
    titulo: (titulo || tituloReserva || "Canção importada").slice(0, 200),
    tom: ficha.tom,
    bpm: ficha.bpm,
    compasso: ficha.compasso,
    blocos,
  };
}

/** Quantos blocos de cada tipo: o resumo da prévia ("3 seções · 12 cifras"). */
export function resumoDaImportacao(c: CancaoImportada): string {
  const n = (tipo: SongBlock["type"]) => c.blocos.filter((b) => b.type === tipo).length;
  const partes: string[] = [];
  const contar = (k: number, um: string, varios: string) => k > 0 && partes.push(`${k} ${k === 1 ? um : varios}`);
  contar(n("section"), "seção", "seções");
  contar(n("chord-line"), "cifra", "cifras");
  contar(n("lyric-line"), "verso", "versos");
  contar(n("note"), "nota", "notas");
  return partes.join(" · ");
}
