import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { textoDoDocx } from "@/lib/arquivoDeLetra";
import { nomeDoArquivo, paraMarkdown, paraPdf, paraWord, roteiro, type CancaoParaExportar, OPCOES_PADRAO } from "@/lib/exportar";
import { lerCancao } from "@/lib/importar";
import type { SongBlock } from "@/types";

let n = 0;
const b = (type: SongBlock["type"], text: string, label?: string): SongBlock => ({ id: String(n++), type, text, label, authorId: "u1" });

const cancao: CancaoParaExportar = {
  titulo: "Madrugada",
  tom: "Am",
  bpm: 78,
  compasso: "4/4",
  estagio: "Escrita",
  coautoria: [
    { nome: "Lara Mendes", percentual: 60 },
    { nome: "Theo Ramos", percentual: 40 },
  ],
  blocos: [
    b("section", "", "Verso 1"),
    b("chord-line", "Am          F            C"),
    b("lyric-line", "Café esfriou na xícara, a cidade"),
    b("chord-line", "Am          F"),
    b("lyric-line", "Janela aberta pra rua"),
    b("note", "Trocar *rua* por avenida?"),
    b("section", "", "Refrão"),
    b("lyric-line", "Madrugada inteira\neu te invento de novo"),
    b("lyric-line", "# não é título"),
  ],
};

/** O que importa comparar: tipo, texto e rótulo. */
const essencia = (blocos: { type: string; text: string; label?: string }[]) =>
  blocos.map((x) => ({ type: x.type, text: x.text, ...(x.type === "section" ? { label: x.label } : {}) }));

describe("roteiro", () => {
  it("tira o que ficou de fora e separa estrofes", () => {
    const t = roteiro(cancao.blocos, { cifras: false, notas: false, ficha: true });
    expect(t[0]).toMatchObject({ rotulo: "Verso 1", alinhado: false });
    expect(t[0]!.linhas).toEqual([
      { tipo: "verso", texto: "Café esfriou na xícara, a cidade" },
      { tipo: "pausa" },
      { tipo: "verso", texto: "Janela aberta pra rua" },
    ]);
    expect(roteiro(cancao.blocos, OPCOES_PADRAO)[0]!.alinhado).toBe(true);
  });
});

describe("Markdown", () => {
  it("cifra em bloco de código, ficha, notas e quebras de linha", () => {
    const md = paraMarkdown(cancao, OPCOES_PADRAO);
    expect(md).toBe(
      [
        "# Madrugada",
        "",
        "Tom: Am · Compasso: 4/4 · Andamento: 78 bpm  ",
        "Estágio: Escrita · Coautoria: Lara Mendes (60%), Theo Ramos (40%)",
        "",
        "## Verso 1",
        "",
        "```",
        "Am          F            C",
        "Café esfriou na xícara, a cidade",
        "Am          F",
        "Janela aberta pra rua",
        "```",
        "",
        "> Trocar *rua* por avenida?",
        "",
        "## Refrão",
        "",
        "Madrugada inteira  ",
        "eu te invento de novo",
        "",
        "\\# não é título",
        "",
      ].join("\n"),
    );
  });

  it("volta para o Compoze sem perder nada", () => {
    const de = lerCancao(paraMarkdown(cancao, OPCOES_PADRAO), "markdown");
    expect(de).toMatchObject({ titulo: "Madrugada", tom: "Am", bpm: 78, compasso: "4/4" });
    // A nota do Markdown perde o *itálico*, que lá é marcação.
    expect(essencia(de.blocos)).toEqual(
      essencia(cancao.blocos.map((x) => (x.type === "note" ? { ...x, text: "Trocar rua por avenida?" } : x))),
    );
  });
});

describe("Word", () => {
  it("é um .docx com estilos, que o importador lê de volta", () => {
    const bytes = paraWord(cancao, OPCOES_PADRAO);
    const arquivos = unzipSync(bytes);
    expect(Object.keys(arquivos).sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "docProps/core.xml",
      "word/_rels/document.xml.rels",
      "word/document.xml",
      "word/styles.xml",
    ]);
    expect(strFromU8(arquivos["word/document.xml"]!)).toContain('<w:pStyle w:val="Cifra"/>');

    const de = lerCancao(textoDoDocx(bytes), "markdown");
    expect(de.titulo).toBe("Madrugada");
    expect(de.tom).toBe("Am");
    const tipos = de.blocos.map((x) => x.type);
    expect(tipos).toEqual(["section", "chord-line", "lyric-line", "chord-line", "lyric-line", "note", "section", "lyric-line", "lyric-line"]);
    expect(de.blocos[2]!.text).toBe("Café esfriou na xícara, a cidade");
    expect(de.blocos[7]!.text).toBe("Madrugada inteira\neu te invento de novo");
  });
});

describe("PDF", () => {
  it("gera um PDF", async () => {
    const bytes = await paraPdf(cancao, OPCOES_PADRAO);
    expect(strFromU8(bytes.subarray(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
  });
});

describe("nome do arquivo", () => {
  it("sem o que o sistema de arquivos recusa", () => {
    expect(nomeDoArquivo("Ela: ida/volta?", "pdf")).toBe("Ela ida volta.pdf");
    expect(nomeDoArquivo("  ", "word")).toBe("Canção.docx");
    expect(nomeDoArquivo("Rua", "markdown")).toBe("Rua.md");
  });
});
