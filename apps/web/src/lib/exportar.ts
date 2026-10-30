import { strToU8 as paraBytes, zipSync } from "fflate";
import type { SongBlock } from "@/types";

/**
 * Exportar uma canção (ADR 0024): PDF para imprimir ou mandar, Markdown para
 * guardar em texto puro (Notion, Obsidian, GitHub), Word para quem vai
 * editar fora e HTML para abrir em qualquer navegador ou pôr num site (ADR
 * 0025). Todos saem do mesmo roteiro (`roteiro`), então dizem a mesma coisa:
 * título, ficha, seções, cifra sobre a letra e as notas.
 *
 * Tudo é gerado no aparelho, sem servidor: funciona offline e em qualquer
 * estágio, de ideia a gravada.
 */

// Sempre um Uint8Array deste contexto: o zip do fflate distingue arquivo de
// pasta com `instanceof`, e o TextEncoder pode devolver o de outro contexto.
const strToU8 = (t: string) => new Uint8Array(paraBytes(t));

export type FormatoDeExportacao = "pdf" | "markdown" | "word" | "html";

export interface CancaoParaExportar {
  titulo: string;
  tom?: string;
  bpm?: number;
  compasso?: string;
  /** "Escrita", "Revisão"… */
  estagio?: string;
  coautoria: { nome: string; percentual: number }[];
  blocos: SongBlock[];
}

export interface OpcoesDeExportacao {
  cifras: boolean;
  notas: boolean;
  ficha: boolean;
}

export const OPCOES_PADRAO: OpcoesDeExportacao = { cifras: true, notas: true, ficha: true };

type Linha =
  | { tipo: "cifra"; texto: string }
  | { tipo: "verso"; texto: string }
  | { tipo: "pausa" }
  | { tipo: "nota"; texto: string };

export interface Trecho {
  rotulo: string | null;
  /** Tem cifra: a letra vai em fonte monoespaçada para o acorde cair na sílaba. */
  alinhado: boolean;
  linhas: Linha[];
}

/** A canção como sequência de trechos (um por seção), já sem o que ficou de fora. */
export function roteiro(blocos: SongBlock[], opcoes: OpcoesDeExportacao): Trecho[] {
  const trechos: Trecho[] = [];
  let atual: Trecho | null = null;
  let anterior: SongBlock["type"] | null = null;
  for (const b of blocos) {
    if (b.type === "section") {
      atual = { rotulo: b.label?.trim() || "Seção", alinhado: false, linhas: [] };
      trechos.push(atual);
      anterior = null;
      continue;
    }
    if (b.type === "chord-line" && !opcoes.cifras) continue;
    if (b.type === "note" && !opcoes.notas) continue;
    if (!b.text.trim()) continue;
    if (!atual) {
      atual = { rotulo: null, alinhado: false, linhas: [] };
      trechos.push(atual);
    }
    // Dois versos seguidos são duas estrofes; cifra e o verso dela andam juntos.
    if (b.type === "lyric-line" && anterior === "lyric-line") atual.linhas.push({ tipo: "pausa" });
    if (b.type === "chord-line") {
      atual.alinhado = true;
      for (const l of b.text.split("\n")) atual.linhas.push({ tipo: "cifra", texto: l.trimEnd() });
    } else if (b.type === "lyric-line") {
      for (const l of b.text.split("\n")) atual.linhas.push({ tipo: "verso", texto: l.trimEnd() });
    } else {
      atual.linhas.push({ tipo: "nota", texto: b.text.trim() });
    }
    anterior = b.type;
  }
  return trechos.filter((t) => t.rotulo !== null || t.linhas.length > 0);
}

/** "Tom: G · Compasso: 4/4 · Andamento: 92 bpm" e a coautoria. */
export function linhasDaFicha(c: CancaoParaExportar): string[] {
  const musica = [
    c.tom && `Tom: ${c.tom}`,
    c.compasso && `Compasso: ${c.compasso}`,
    c.bpm && `Andamento: ${c.bpm} bpm`,
  ].filter(Boolean);
  const obra = [
    c.estagio && `Estágio: ${c.estagio}`,
    c.coautoria.length > 0 && `Coautoria: ${c.coautoria.map((p) => `${p.nome} (${p.percentual}%)`).join(", ")}`,
  ].filter(Boolean);
  return [musica.join(" · "), obra.join(" · ")].filter(Boolean);
}

/** Nome do arquivo a partir do título, sem o que o sistema de arquivos recusa. */
export function nomeDoArquivo(titulo: string, formato: FormatoDeExportacao): string {
  const base = [...titulo]
    .map((c) => (c.charCodeAt(0) < 32 ? " " : c))
    .join("")
    .replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Canção";
  return `${base}.${EXTENSAO[formato]}`;
}

export const EXTENSAO: Record<FormatoDeExportacao, string> = { pdf: "pdf", markdown: "md", word: "docx", html: "html" };

export const TIPO_DO_ARQUIVO: Record<FormatoDeExportacao, string> = {
  html: "text/html",
  pdf: "application/pdf",
  markdown: "text/markdown",
  word: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// ------------------------------------------------------------------ Markdown

/** Escapa o que o Markdown leria como marcação no começo de um verso. */
const escaparMd = (t: string) => t.replace(/([\\`*_])/g, "\\$1").replace(/^(\s*)([#>+-]|\d+\.)(\s)/, "$1\\$2$3");

/**
 * Markdown. A seção com cifra vai num bloco de código, que é o único jeito
 * de o Markdown manter os espaços que alinham acorde e sílaba. A importação
 * do Compoze lê este formato de volta sem perder nada.
 */
export function paraMarkdown(c: CancaoParaExportar, opcoes: OpcoesDeExportacao): string {
  const saida: string[] = [`# ${escaparMd(c.titulo.trim() || "Sem título")}`, ""];
  if (opcoes.ficha) {
    const ficha = linhasDaFicha(c);
    if (ficha.length > 0) saida.push(...ficha.map((l, i) => (i < ficha.length - 1 ? `${l}  ` : l)), "");
  }
  for (const t of roteiro(c.blocos, opcoes)) {
    if (t.rotulo !== null) saida.push(`## ${escaparMd(t.rotulo)}`, "");
    let emCodigo = false;
    const abrir = () => {
      if (!emCodigo && t.alinhado) saida.push("```");
      emCodigo = t.alinhado;
    };
    const fecharCodigo = () => {
      if (emCodigo) saida.push("```");
      emCodigo = false;
    };
    t.linhas.forEach((l, i) => {
      const seguinte = t.linhas[i + 1];
      if (l.tipo === "nota") {
        fecharCodigo();
        if (saida[saida.length - 1] !== "") saida.push("");
        saida.push(...l.texto.split("\n").map((x) => `> ${x}`), "");
      } else if (l.tipo === "pausa") {
        if (emCodigo) saida.push("");
        else if (saida[saida.length - 1] !== "") saida.push("");
      } else if (t.alinhado) {
        abrir();
        saida.push(l.texto);
      } else {
        // Quebra de linha dura (dois espaços), menos na última da estrofe.
        const fimDaEstrofe = !seguinte || seguinte.tipo !== "verso";
        saida.push(fimDaEstrofe ? escaparMd(l.texto) : `${escaparMd(l.texto)}  `);
      }
    });
    fecharCodigo();
    if (saida[saida.length - 1] !== "") saida.push("");
  }
  return `${saida.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

// ------------------------------------------------------------------ HTML

const html = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// O Caderno em poucas linhas: papel, tinta, lápis vermelho, régua fina. As
// fontes do app (Newsreader, IBM Plex Mono) valem se a pessoa as tiver;
// senão, Georgia e Courier, que todo sistema tem.
const ESTILO_HTML = `
:root{--papel:#f3efe6;--folha:#faf8f3;--tinta:#1c1b18;--tinta-2:#57534a;--tinta-3:#8a8578;--lapis:#b4412b;--linha:#d8d1c2}
@media (prefers-color-scheme:dark){:root{--papel:#151412;--folha:#1b1a17;--tinta:#ece6d9;--tinta-2:#ada697;--tinta-3:#7c766a;--lapis:#e2694f;--linha:#34312b}}
*{box-sizing:border-box}
body{margin:0;background:var(--papel);color:var(--tinta);font:16px/1.55 "Hanken Grotesk",system-ui,sans-serif}
main{max-width:46rem;margin:0 auto;padding:3.5rem 1.25rem 4rem}
h1{font:400 2.6rem/1.1 Newsreader,Georgia,serif;margin:0 0 .75rem;letter-spacing:-.01em}
.ficha{color:var(--tinta-2);font-size:.82rem;margin:0 0 2.5rem}
.ficha p{margin:0}
section{margin:0 0 1.75rem}
h2{display:flex;align-items:center;gap:.75rem;margin:0 0 .6rem;font-size:.7rem;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--tinta-2)}
h2::after{content:"";flex:1;height:1px;background:var(--linha)}
pre{margin:0;font:14px/1.6 "IBM Plex Mono","Courier New",monospace;white-space:pre;overflow-x:auto}
pre b{color:var(--lapis);font-weight:500}
p.verso{margin:0 0 .9rem;font:1.2rem/1.55 Newsreader,Georgia,serif;white-space:pre-wrap}
blockquote{margin:.75rem 0;padding:.5rem .8rem;border:1px dashed var(--tinta-3);color:var(--tinta-2);font-style:italic;font-size:.9rem;white-space:pre-wrap}
footer{margin-top:3rem;color:var(--tinta-3);font-size:.75rem}
@media print{body{background:#fff}main{padding:0}footer{display:none}}
`;

/**
 * HTML: uma página só, com o estilo embutido, que abre sem internet em
 * qualquer navegador e imprime bem. A seção com cifra vai num `<pre>` (cifra
 * em `<b>`), que mantém o alinhamento; a importação lê de volta.
 */
export function paraHtml(c: CancaoParaExportar, opcoes: OpcoesDeExportacao): string {
  const titulo = c.titulo.trim() || "Sem título";
  const corpo: string[] = [`<h1>${html(titulo)}</h1>`];
  if (opcoes.ficha) {
    const ficha = linhasDaFicha(c);
    if (ficha.length > 0) corpo.push(`<div class="ficha">${ficha.map((l) => `<p>${html(l)}</p>`).join("")}</div>`);
  }
  for (const t of roteiro(c.blocos, opcoes)) {
    const partes: string[] = [];
    if (t.rotulo !== null) partes.push(`<h2>${html(t.rotulo)}</h2>`);
    let pre: string[] | null = null;
    let estrofe: string[] = [];
    const fecharPre = () => {
      if (pre) partes.push(`<pre>${pre.join("\n")}</pre>`);
      pre = null;
    };
    const fecharEstrofe = () => {
      if (estrofe.length) partes.push(`<p class="verso">${estrofe.map(html).join("<br>")}</p>`);
      estrofe = [];
    };
    for (const l of t.linhas) {
      if (l.tipo === "nota") {
        fecharPre();
        fecharEstrofe();
        partes.push(`<blockquote>${html(l.texto)}</blockquote>`);
      } else if (l.tipo === "pausa") {
        if (pre) (pre as string[]).push("");
        else fecharEstrofe();
      } else if (t.alinhado) {
        pre ??= [];
        (pre as string[]).push(l.tipo === "cifra" ? `<b>${html(l.texto)}</b>` : html(l.texto));
      } else estrofe.push(l.texto);
    }
    fecharPre();
    fecharEstrofe();
    corpo.push(`<section>${partes.join("")}</section>`);
  }
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Compoze">
<title>${html(titulo)}</title>
<style>${ESTILO_HTML}</style>
</head>
<body>
<main>
${corpo.join("\n")}
<footer>${html(titulo)} · Compoze</footer>
</main>
</body>
</html>
`;
}

// ------------------------------------------------------------------ Word

const COR = { tinta: "1C1B18", tinta2: "57534A", tinta3: "8A8578", lapis: "B4412B", linha: "D8D1C2" };

const xml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function paragrafoWord(texto: string, estilo: string, extra = ""): string {
  const runs = texto
    .split("\n")
    .map((l, i) => `${i > 0 ? "<w:r><w:br/></w:r>" : ""}<w:r>${extra}<w:t xml:space="preserve">${xml(l)}</w:t></w:r>`)
    .join("");
  return `<w:p><w:pPr><w:pStyle w:val="${estilo}"/></w:pPr>${runs}</w:p>`;
}

const ESTILOS_WORD = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Georgia"/><w:color w:val="${COR.tinta}"/><w:sz w:val="24"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="120"/></w:pPr><w:rPr><w:sz w:val="52"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Ficha"><w:name w:val="Ficha"/><w:basedOn w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="${COR.tinta2}"/><w:sz w:val="18"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="2" w:color="${COR.linha}"/></w:pBdr><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:caps/><w:color w:val="${COR.tinta2}"/><w:spacing w:val="30"/><w:sz w:val="17"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Cifra"><w:name w:val="Cifra"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="80" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:b/><w:color w:val="${COR.lapis}"/><w:sz w:val="20"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="LetraAlinhada"><w:name w:val="Letra alinhada"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:line="260" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:sz w:val="21"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Letra"><w:name w:val="Letra"/><w:basedOn w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Nota"><w:name w:val="Nota"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="120" w:after="120"/><w:ind w:left="240"/><w:pBdr><w:left w:val="dashed" w:sz="6" w:space="8" w:color="${COR.tinta3}"/></w:pBdr></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:i/><w:color w:val="${COR.tinta2}"/><w:sz w:val="20"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Pausa"><w:name w:val="Pausa"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="12"/></w:rPr></w:style>
</w:styles>`;

/**
 * Word (.docx), montado à mão: o formato é um zip com XML, e uma biblioteca
 * de Word inteira pesaria mais que o resto do editor. Cifra e letra
 * alinhada vão em Courier New, que todo Word e Google Docs têm.
 */
export function paraWord(c: CancaoParaExportar, opcoes: OpcoesDeExportacao): Uint8Array {
  const corpo: string[] = [paragrafoWord(c.titulo.trim() || "Sem título", "Title")];
  if (opcoes.ficha) for (const l of linhasDaFicha(c)) corpo.push(paragrafoWord(l, "Ficha"));
  corpo.push(paragrafoWord("", "Pausa"));
  for (const t of roteiro(c.blocos, opcoes)) {
    if (t.rotulo !== null) corpo.push(paragrafoWord(t.rotulo, "Heading2"));
    for (const l of t.linhas) {
      if (l.tipo === "pausa") corpo.push(paragrafoWord("", "Pausa"));
      else if (l.tipo === "nota") corpo.push(paragrafoWord(l.texto, "Nota"));
      else if (l.tipo === "cifra") corpo.push(paragrafoWord(l.texto, "Cifra"));
      else corpo.push(paragrafoWord(l.texto, t.alinhado ? "LetraAlinhada" : "Letra"));
    }
  }
  const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${corpo.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`;

  return zipSync({
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`),
    "docProps/core.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(c.titulo)}</dc:title><dc:creator>Compoze</dc:creator></cp:coreProperties>`),
    "word/_rels/document.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "word/styles.xml": strToU8(ESTILOS_WORD),
    "word/document.xml": strToU8(documento),
  });
}

// ------------------------------------------------------------------ PDF

// As fontes-padrão do PDF (Times, Courier, Helvetica) só têm o alfabeto
// latino do Windows (WinAnsi). O que fica fora vira o parente mais próximo.
const WINANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const paraWinAnsi = (t: string) =>
  t
    .replace(/♯/g, "#")
    .replace(/♭/g, "b")
    .replace(/※/g, "*")
    .replace(/[\u2028\u2029]/g, " ")
    .replace(/./gu, (ch) => (ch.charCodeAt(0) < 256 || WINANSI_EXTRA.includes(ch) ? ch : "?"));

const RGB = { tinta: [28, 27, 24], tinta2: [87, 83, 74], tinta3: [138, 133, 120], lapis: [180, 65, 43], linha: [216, 209, 194] } as const;

/**
 * PDF em A4, no espírito do Caderno: título em serifa, seções em versalete
 * com uma régua fina, cifra em lápis vermelho sobre a letra. jsPDF entra só
 * quando alguém exporta um PDF.
 */
export async function paraPdf(c: CancaoParaExportar, opcoes: OpcoesDeExportacao): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  pdf.setProperties({ title: c.titulo, creator: "Compoze" });

  const largura = pdf.internal.pageSize.getWidth();
  const altura = pdf.internal.pageSize.getHeight();
  const margem = 62;
  const util = largura - margem * 2;
  const pe = altura - 56;
  let y = margem + 10;

  const trechos = roteiro(c.blocos, opcoes);
  // Cifra e letra alinhada não podem quebrar linha: a fonte diminui até a
  // linha mais longa caber (Courier tem 0,6 em de largura por letra).
  const maisLonga = Math.max(0, ...trechos.filter((t) => t.alinhado).flatMap((t) => t.linhas.map((l) => ("texto" in l ? l.texto.length : 0))));
  const corpoMono = Math.max(6.5, Math.min(10.5, util / (0.6 * Math.max(1, maisLonga))));

  const cor = (rgb: readonly number[]) => pdf.setTextColor(rgb[0]!, rgb[1]!, rgb[2]!);
  const caber = (precisa: number) => {
    if (y + precisa <= pe) return;
    pdf.addPage();
    y = margem;
  };

  // Título e ficha
  pdf.setFont("times", "normal");
  pdf.setFontSize(26);
  cor(RGB.tinta);
  for (const l of pdf.splitTextToSize(paraWinAnsi(c.titulo.trim() || "Sem título"), util) as string[]) {
    pdf.text(l, margem, y);
    y += 30;
  }
  if (opcoes.ficha) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    cor(RGB.tinta2);
    for (const l of linhasDaFicha(c)) {
      for (const parte of pdf.splitTextToSize(paraWinAnsi(l), util) as string[]) {
        pdf.text(parte, margem, y);
        y += 12;
      }
    }
  }
  y += 14;

  for (const t of trechos) {
    if (t.rotulo !== null) {
      // A seção não fica sozinha no pé da página.
      caber(60);
      y += 12;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      cor(RGB.tinta2);
      // Sem espaçar as letras: espaçado, o PDF guarda "V E R S O" e a
      // importação não reconheceria a seção de volta.
      const rotulo = paraWinAnsi(t.rotulo.toLocaleUpperCase("pt-BR"));
      pdf.text(rotulo, margem, y);
      const fimDoRotulo = margem + pdf.getTextWidth(rotulo) + 10;
      pdf.setDrawColor(RGB.linha[0], RGB.linha[1], RGB.linha[2]);
      pdf.setLineWidth(0.5);
      pdf.line(Math.min(fimDoRotulo, largura - margem), y - 2.5, largura - margem, y - 2.5);
      y += 18;
    }
    t.linhas.forEach((l, i) => {
      if (l.tipo === "pausa") {
        y += 9;
      } else if (l.tipo === "cifra") {
        // A cifra desce de página junto com o verso dela.
        const proxima = t.linhas[i + 1];
        caber(proxima?.tipo === "verso" ? corpoMono * 3 : corpoMono * 1.6);
        pdf.setFont("courier", "bold");
        pdf.setFontSize(corpoMono);
        cor(RGB.lapis);
        pdf.text(paraWinAnsi(l.texto), margem, y);
        y += corpoMono * 1.3;
      } else if (l.tipo === "verso" && t.alinhado) {
        caber(corpoMono * 1.6);
        pdf.setFont("courier", "normal");
        pdf.setFontSize(corpoMono);
        cor(RGB.tinta);
        pdf.text(paraWinAnsi(l.texto), margem, y);
        y += corpoMono * 1.6;
      } else if (l.tipo === "verso") {
        pdf.setFont("times", "normal");
        pdf.setFontSize(12.5);
        cor(RGB.tinta);
        for (const parte of pdf.splitTextToSize(paraWinAnsi(l.texto), util) as string[]) {
          caber(18);
          pdf.text(parte, margem, y);
          y += 18;
        }
      } else {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(9.5);
        // "Nota:" diz no papel o que é, e a importação lê de volta como nota.
        const partes = `Nota: ${l.texto}`.split("\n").flatMap((x) => pdf.splitTextToSize(paraWinAnsi(x), util - 14) as string[]);
        caber(Math.min(partes.length, 3) * 13 + 16);
        y += 6;
        const inicio = y - 9;
        cor(RGB.tinta2);
        for (const parte of partes) {
          caber(13);
          pdf.text(parte, margem + 12, y);
          y += 13;
        }
        pdf.setDrawColor(RGB.tinta3[0], RGB.tinta3[1], RGB.tinta3[2]);
        pdf.setLineWidth(0.6);
        pdf.setLineDashPattern([2, 2], 0);
        pdf.line(margem + 2, Math.max(inicio, margem - 9), margem + 2, y - 9);
        pdf.setLineDashPattern([], 0);
        y += 8;
      }
    });
  }

  // Rodapé: título e página, discreto.
  const paginas = pdf.getNumberOfPages();
  for (let n = 1; n <= paginas; n++) {
    pdf.setPage(n);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    cor(RGB.tinta3);
    pdf.text(paraWinAnsi(`${c.titulo.trim() || "Sem título"} · Compoze`), margem, altura - 32);
    if (paginas > 1) pdf.text(`${n} de ${paginas}`, largura - margem, altura - 32, { align: "right" });
  }

  return new Uint8Array(pdf.output("arraybuffer"));
}

/** Gera o arquivo no formato pedido. */
export async function exportar(
  formato: FormatoDeExportacao,
  c: CancaoParaExportar,
  opcoes: OpcoesDeExportacao,
): Promise<{ nome: string; tipo: string; bytes: Uint8Array }> {
  const bytes =
    formato === "pdf"
      ? await paraPdf(c, opcoes)
      : formato === "word"
        ? paraWord(c, opcoes)
        : strToU8(formato === "html" ? paraHtml(c, opcoes) : paraMarkdown(c, opcoes));
  return { nome: nomeDoArquivo(c.titulo, formato), tipo: TIPO_DO_ARQUIVO[formato], bytes };
}
