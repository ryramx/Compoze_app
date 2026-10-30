import { strFromU8, unzipSync } from "fflate";
import type { FormatoDeTexto } from "@/lib/importar";

/**
 * Do arquivo ao texto (ADR 0024). Cada formato tem o seu jeito de guardar a
 * letra; aqui todos viram texto puro, com a cifra no lugar, para
 * `lib/importar.ts` montar os blocos. Tudo roda no aparelho: funciona sem
 * internet e o arquivo não passa pelo servidor.
 */

export interface TextoDoArquivo {
  texto: string;
  formato: FormatoDeTexto;
  /** O que a pessoa deve conferir na prévia. */
  aviso?: string;
}

export class ArquivoRecusado extends Error {}

/** Arquivos de letra são pequenos; o limite só evita travar o aparelho. */
const TAMANHO_MAXIMO = 15 * 1024 * 1024;

/** O que o seletor de arquivo oferece. */
export const ACEITOS = [
  ".pdf",
  ".docx",
  ".odt",
  ".md",
  ".markdown",
  ".txt",
  ".cho",
  ".chopro",
  ".chordpro",
  ".crd",
  ".html",
  ".htm",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "text/markdown",
  "text/html",
  "text/plain",
].join(",");

function extensao(nome: string): string {
  return /\.([a-z0-9]+)$/i.exec(nome)?.[1]?.toLowerCase() ?? "";
}

export async function lerArquivoDeLetra(arquivo: File): Promise<TextoDoArquivo> {
  if (arquivo.size > TAMANHO_MAXIMO) throw new ArquivoRecusado("O arquivo passa de 15 MB. Uma letra cabe em bem menos que isso.");
  const ext = extensao(arquivo.name);
  const tipo = arquivo.type;

  if (ext === "pdf" || tipo === "application/pdf") {
    const { textoDoPdf } = await import("@/lib/pdfParaTexto");
    const texto = await textoDoPdf(new Uint8Array(await arquivo.arrayBuffer()));
    if (!texto.trim()) {
      throw new ArquivoRecusado(
        "Este PDF não tem texto, só imagem (uma digitalização ou foto). O Compoze lê PDFs com o texto selecionável.",
      );
    }
    return { texto, formato: "texto", aviso: "Num PDF, a posição das cifras é estimada. Confira se cada acorde ficou sobre a sílaba certa." };
  }
  if (ext === "docx" || tipo.includes("wordprocessingml")) {
    return { texto: textoDoDocx(new Uint8Array(await arquivo.arrayBuffer())), formato: "markdown" };
  }
  if (ext === "odt" || tipo.includes("opendocument.text")) {
    return { texto: textoDoOdt(new Uint8Array(await arquivo.arrayBuffer())), formato: "markdown" };
  }
  if (ext === "doc") {
    throw new ArquivoRecusado("Arquivos .doc (Word antigo) não abrem aqui. No Word, salve como .docx e importe de novo.");
  }
  if (ext === "html" || ext === "htm" || tipo === "text/html") {
    return { texto: textoDoHtml(await arquivo.text()), formato: "markdown" };
  }
  if (ext === "md" || ext === "markdown" || tipo === "text/markdown") {
    return { texto: await arquivo.text(), formato: "markdown" };
  }
  if (["txt", "cho", "chopro", "chordpro", "crd", "pro"].includes(ext) || tipo.startsWith("text/")) {
    return { texto: await arquivo.text(), formato: "texto" };
  }
  throw new ArquivoRecusado("Este tipo de arquivo não é de letra. Use PDF, Word (.docx), Markdown, HTML ou texto.");
}

// ------------------------------------------------------------------ Word

function abrirZip(bytes: Uint8Array, caminho: string): Document {
  let arquivos: Record<string, Uint8Array>;
  try {
    arquivos = unzipSync(bytes, { filter: (f) => f.name === caminho });
  } catch {
    throw new ArquivoRecusado("Não deu para abrir o arquivo. Ele pode estar corrompido ou protegido por senha.");
  }
  const xml = arquivos[caminho];
  if (!xml) throw new ArquivoRecusado("O arquivo não tem o texto onde deveria. Ele pode estar corrompido.");
  return new DOMParser().parseFromString(strFromU8(xml), "application/xml");
}

/** Filhos com o nome local dado (o XML do Word é todo com prefixo `w:`). */
const filhos = (el: Element, nome: string) => [...el.children].filter((c) => c.localName === nome);

/**
 * Texto de um .docx, parágrafo por parágrafo. Título e cabeçalhos do Word
 * viram `#` e `##`, que o importador lê como título e seção; citação vira
 * `>`, que ele lê como nota. Espaços e
 * tabulações ficam como estão, porque é com eles que a cifra se alinha.
 */
export function textoDoDocx(bytes: Uint8Array): string {
  const doc = abrirZip(bytes, "word/document.xml");
  const corpo = doc.getElementsByTagNameNS("*", "body")[0];
  if (!corpo) return "";
  const saida: string[] = [];

  const paragrafo = (p: Element) => {
    const estilo = p.getElementsByTagNameNS("*", "pStyle")[0]?.getAttribute("w:val") ?? "";
    let texto = "";
    const percorrer = (el: Element) => {
      for (const c of el.children) {
        switch (c.localName) {
          case "t":
            texto += c.textContent ?? "";
            break;
          case "tab":
            texto += "\t";
            break;
          case "br":
          case "cr":
            texto += "\n";
            break;
          case "noBreakHyphen":
            texto += "-";
            break;
          case "pPr":
          case "rPr":
          case "del":
          case "instrText":
            break;
          default:
            percorrer(c);
        }
      }
    };
    percorrer(p);
    // Escapa o que o importador leria como Markdown sem a pessoa ter escrito.
    const limpo = texto.replace(/^(\s*)([#>])/gm, "$1\\$2");
    if (/^(Title|Titulo|Ttulo)$/i.test(estilo)) saida.push(`# ${limpo.trim()}`);
    else if (/^(Heading|Ttulo)[1-6]$/i.test(estilo) && limpo.trim()) saida.push(`## ${limpo.trim()}`);
    // Citação do Word, e a nota que a exportação do Compoze escreve, voltam como nota.
    else if (/^(Nota|Quote|IntenseQuote|Citao|CitaoIntensa)$/i.test(estilo) && limpo.trim()) {
      saida.push("", ...limpo.split("\n").map((l) => `> ${l}`), "");
    }
    else saida.push(limpo);
  };

  const bloco = (el: Element) => {
    for (const c of el.children) {
      if (c.localName === "p") paragrafo(c);
      else if (c.localName === "tbl") {
        for (const linha of filhos(c, "tr")) for (const celula of filhos(linha, "tc")) bloco(celula);
      } else if (c.localName === "sdt") {
        const conteudo = filhos(c, "sdtContent")[0];
        if (conteudo) bloco(conteudo);
      }
    }
  };
  bloco(corpo);
  return saida.join("\n");
}

/** Texto de um .odt (LibreOffice), com as mesmas regras do .docx. */
export function textoDoOdt(bytes: Uint8Array): string {
  const doc = abrirZip(bytes, "content.xml");
  const corpo = doc.getElementsByTagNameNS("*", "text")[0];
  if (!corpo) return "";
  const saida: string[] = [];

  const linha = (el: Element): string => {
    let texto = "";
    for (const n of el.childNodes) {
      if (n.nodeType === 3) texto += n.textContent ?? "";
      else if (n.nodeType === 1) {
        const c = n as Element;
        if (c.localName === "s") texto += " ".repeat(Number(c.getAttribute("text:c") ?? "1") || 1);
        else if (c.localName === "tab") texto += "\t";
        else if (c.localName === "line-break") texto += "\n";
        else if (c.localName !== "note" && c.localName !== "annotation") texto += linha(c);
      }
    }
    return texto;
  };

  const bloco = (el: Element) => {
    for (const c of el.children) {
      if (c.localName === "p") saida.push(linha(c).replace(/^(\s*)([#>])/gm, "$1\\$2"));
      else if (c.localName === "h") {
        const nivel = Number(c.getAttribute("text:outline-level") ?? "2");
        const t = linha(c).trim();
        if (t) saida.push(`${nivel <= 1 ? "#" : "##"} ${t}`);
      } else if (["list", "list-item", "section", "table", "table-row", "table-cell"].includes(c.localName)) bloco(c);
    }
  };
  bloco(corpo);
  return saida.join("\n");
}

// ------------------------------------------------------------------ HTML

/** Elementos de dentro da linha: um `div` só com eles é um parágrafo. */
const EM_LINHA = new Set(["span", "b", "i", "em", "strong", "a", "br", "small", "u", "mark", "sup", "sub", "code", "font", "s"]);

/** O que não é texto da canção numa página. */
const FORA_DO_TEXTO = new Set(["script", "style", "noscript", "template", "footer", "nav", "head", "svg", "button", "form"]);

/**
 * Texto de uma página HTML (ADR 0025), no mesmo Markdown leve dos outros
 * formatos: `h1` é título, `h2`–`h6` seção, `pre` guarda a cifra alinhada,
 * `blockquote` é nota. Parágrafo junta os espaços como o navegador faz,
 * menos onde há `<br>`.
 */
export function textoDoHtml(fonte: string): string {
  const doc = new DOMParser().parseFromString(fonte, "text/html");
  const saida: string[] = [];

  const linhaDe = (el: Element): string => {
    let texto = "";
    for (const n of el.childNodes) {
      if (n.nodeType === 3) texto += (n.textContent ?? "").replace(/\s+/g, " ");
      else if (n.nodeType === 1) {
        const c = n as Element;
        if (c.localName === "br") texto += "\n";
        else if (!FORA_DO_TEXTO.has(c.localName)) texto += linhaDe(c);
      }
    }
    return texto;
  };
  const limpa = (t: string) =>
    t
      .split("\n")
      .map((l) => l.trim().replace(/^([#>])/, "\\$1"))
      .join("\n")
      .trim();

  const bloco = (el: Element) => {
    for (const c of el.children) {
      const nome = c.localName;
      if (FORA_DO_TEXTO.has(nome)) continue;
      if (nome === "h1") saida.push(`# ${linhaDe(c).trim()}`, "");
      else if (/^h[2-6]$/.test(nome)) saida.push(`## ${linhaDe(c).trim()}`, "");
      else if (nome === "pre") saida.push("```", (c.textContent ?? "").replace(/\n$/, ""), "```", "");
      else if (nome === "blockquote") saida.push(...limpa(linhaDe(c)).split("\n").map((l) => `> ${l}`), "");
      else if (nome === "p" || nome === "li" || (nome === "div" && [...c.children].every((x) => EM_LINHA.has(x.localName)))) {
        const t = limpa(linhaDe(c));
        if (t) saida.push(t, "");
      } else bloco(c);
    }
  };
  bloco(doc.body);
  return saida.join("\n");
}

