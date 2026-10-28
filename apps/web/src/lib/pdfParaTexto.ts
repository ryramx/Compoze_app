import { ehLinhaDeCifra } from "@/lib/importar";

/**
 * PDF → texto com a cifra no lugar (ADR 0024).
 *
 * O PDF não tem linhas nem espaços: tem pedaços de texto soltos, cada um numa
 * posição da página. Aqui os pedaços viram linhas (pela altura), os vãos
 * viram espaços (pela largura média de uma letra) e, o mais importante, cada
 * acorde de uma linha de cifra vai para a letra do verso de baixo que está
 * na mesma posição horizontal. Com fonte proporcional, contar espaços
 * erraria o lugar; medir pela posição acerta a sílaba.
 */

export interface PedacoDoPdf {
  texto: string;
  x: number;
  /** Altura na página, de baixo para cima (como no PDF). */
  y: number;
  largura: number;
  altura: number;
  /** Fonte monoespaçada: toda letra tem a mesma largura. */
  mono?: boolean;
}

interface Linha {
  y: number;
  altura: number;
  texto: string;
  /** Posição x do começo de cada caractere de `texto`. */
  xs: number[];
  /** Palavras com a posição de cada uma. */
  palavras: { texto: string; x: number }[];
}

const mediana = (v: number[]) => {
  if (v.length === 0) return 0;
  const o = [...v].sort((a, b) => a - b);
  // Mediana de baixo: com poucas linhas, os vãos de estrofe não puxam o passo.
  return o[Math.floor((o.length - 1) / 2)]!;
};

// Largura de cada letra na Helvetica, em milésimos de em. Serve de régua para
// qualquer fonte proporcional: o que importa é a proporção ("m" é quase
// quatro vezes um "i"), não o valor exato.
const LARGURAS: Record<string, number> = {
  " ": 278, a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222, m: 833,
  n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500, K: 667, L: 556, M: 833, N: 722,
  O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  ",": 278, ".": 278, ":": 278, ";": 278, "!": 278, "?": 556, "'": 191, '"': 355, "-": 333, "(": 333, ")": 333,
};
const larguraDaLetra = (c: string) => LARGURAS[c] ?? LARGURAS[c.normalize("NFD")[0] ?? ""] ?? 556;

/** Onde começa cada letra do pedaço, repartindo a largura dele. */
function posicoes(p: PedacoDoPdf): number[] {
  const letras = [...p.texto];
  const pesos = p.mono ? letras.map(() => 1) : letras.map(larguraDaLetra);
  const total = pesos.reduce((a, b) => a + b, 0) || 1;
  let acumulado = 0;
  return pesos.map((w) => {
    const x = p.x + (p.largura * acumulado) / total;
    acumulado += w;
    return x;
  });
}

function montarLinhas(pedacos: PedacoDoPdf[], letra: number, margem: number): Linha[] {
  const ordenados = pedacos.filter((p) => p.texto.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const grupos: PedacoDoPdf[][] = [];
  for (const p of ordenados) {
    const g = grupos[grupos.length - 1];
    if (g && Math.abs(g[0]!.y - p.y) <= Math.max(g[0]!.altura, p.altura) * 0.45) g.push(p);
    else grupos.push([p]);
  }
  return grupos.map((g) => {
    g.sort((a, b) => a.x - b.x);
    let texto = "";
    const xs: number[] = [];
    let fim = margem;
    for (const p of g) {
      const vao = p.x - fim;
      const espacos = texto === "" ? Math.max(0, Math.round(vao / letra)) : vao > letra * 0.25 ? Math.max(1, Math.round(vao / letra)) : 0;
      for (let k = 0; k < espacos; k++) {
        xs.push(fim + (vao * k) / espacos);
        texto += " ";
      }
      xs.push(...posicoes(p));
      texto += [...p.texto].join("");
      fim = p.x + p.largura;
    }
    const palavras: Linha["palavras"] = [];
    for (const m of texto.matchAll(/\S+/g)) palavras.push({ texto: m[0], x: xs[m.index!]! });
    return { y: g[0]!.y, altura: Math.max(...g.map((p) => p.altura)), texto: texto.trimEnd(), xs, palavras };
  });
}

/** Põe cada acorde sobre o caractere do verso que está na mesma posição. */
function alinharSobre(cifra: Linha, verso: Linha, letra: number): string {
  let saida = "";
  const fimDoVerso = verso.xs.length > 0 ? verso.xs[verso.xs.length - 1]! + letra : 0;
  for (const p of cifra.palavras) {
    let coluna: number;
    if (verso.xs.length > 0 && p.x > fimDoVerso) {
      coluna = verso.xs.length + Math.round((p.x - fimDoVerso) / letra);
    } else {
      coluna = 0;
      let melhor = Infinity;
      verso.xs.forEach((x, i) => {
        const d = Math.abs(x - p.x);
        if (d < melhor) {
          melhor = d;
          coluna = i;
        }
      });
    }
    if (saida.length > 0) coluna = Math.max(coluna, saida.length + 1);
    saida = saida.padEnd(coluna) + p.texto;
  }
  return saida;
}

/** Linha que se repete em todas as páginas (cabeçalho, rodapé, endereço do site). */
const assinatura = (t: string) => t.replace(/[0-9]+/g, "#").replace(/\s+/g, " ").trim().toLowerCase();

/** O texto de um PDF já desmontado em pedaços, página por página. */
export function textoDosPedacos(paginas: PedacoDoPdf[][]): string {
  const todos = paginas.flat().filter((p) => p.texto.trim().length >= 2);
  // Largura de uma letra: a mediana dá a da fonte do corpo (a letra).
  const letra = mediana(todos.map((p) => p.largura / p.texto.length)) || 5;
  const margem = Math.min(...paginas.flat().filter((p) => p.texto.trim()).map((p) => p.x));

  const porPagina = paginas.map((p) => montarLinhas(p, letra, Number.isFinite(margem) ? margem : 0));

  // Cabeçalho e rodapé: a mesma linha no alto ou no pé de toda página.
  const repetidas = new Set<string>();
  if (porPagina.length >= 2) {
    const contagem = new Map<string, number>();
    for (const linhas of porPagina) {
      const pontas = new Set([...linhas.slice(0, 2), ...linhas.slice(-2)].map((l) => assinatura(l.texto)));
      for (const a of pontas) contagem.set(a, (contagem.get(a) ?? 0) + 1);
    }
    for (const [a, n] of contagem) if (n >= porPagina.length) repetidas.add(a);
  }

  const saida: string[] = [];
  for (const linhasDaPagina of porPagina) {
    const linhas = linhasDaPagina.filter((l, i, todas) => {
      const ponta = i < 2 || i >= todas.length - 2;
      return !(ponta && repetidas.has(assinatura(l.texto)));
    });
    const passo = mediana(linhas.slice(1).map((l, i) => linhas[i]!.y - l.y).filter((d) => d > 0));
    linhas.forEach((l, i) => {
      const anterior = linhas[i - 1];
      // Um vão bem maior que o de costume entre linhas é troca de estrofe.
      if (anterior && passo > 0 && anterior.y - l.y > passo * 1.6) saida.push("");
      const seguinte = linhas[i + 1];
      const ehCifra = ehLinhaDeCifra(l.texto);
      if (ehCifra && seguinte && !ehLinhaDeCifra(seguinte.texto) && l.y - seguinte.y < Math.max(l.altura, seguinte.altura) * 2.2) {
        saida.push(alinharSobre(l, seguinte, letra));
      } else saida.push(l.texto);
    });
    saida.push("");
  }
  // Só as linhas em branco das pontas saem: o recuo da primeira linha alinha a cifra.
  return saida.join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\s*\n/, "").trimEnd();
}

/** Lê o PDF (pdf.js, carregado só quando alguém importa um PDF). */
export async function textoDoPdf(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { default: trabalhador } = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = trabalhador;

  const pdf = await pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise;
  try {
    const paginas: PedacoDoPdf[][] = [];
    // Uma letra não passa de algumas páginas; o limite protege de um livro.
    for (let n = 1; n <= Math.min(pdf.numPages, 40); n++) {
      const pagina = await pdf.getPage(n);
      const conteudo = await pagina.getTextContent();
      const pedacos: PedacoDoPdf[] = [];
      for (const item of conteudo.items) {
        if (!("str" in item) || !item.str) continue;
        const [a, b, , , x, y] = item.transform as number[];
        pedacos.push({
          mono: conteudo.styles[item.fontName]?.fontFamily === "monospace",
          texto: item.str,
          x: x!,
          y: y!,
          largura: item.width,
          altura: item.height || Math.hypot(a!, b!),
        });
      }
      paginas.push(pedacos);
    }
    return textoDosPedacos(paginas);
  } finally {
    await pdf.destroy();
  }
}
