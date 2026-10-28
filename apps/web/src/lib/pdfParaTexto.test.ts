import { describe, expect, it } from "vitest";
import { textoDosPedacos, type PedacoDoPdf } from "@/lib/pdfParaTexto";

/** Pedaço com fonte monoespaçada de 6pt por letra. */
const p = (texto: string, x: number, y: number, largura = texto.length * 6): PedacoDoPdf => ({ texto, x, y, largura, altura: 10, mono: true });

describe("textoDosPedacos", () => {
  it("monta linhas e põe o acorde sobre a letra pela posição", () => {
    // Letra em fonte proporcional: "Quando" é largo (60pt para 6 letras),
    // então o D em x=124 cai sobre o "c" de "cidade", não na coluna 20.
    const texto = textoDosPedacos([
      [
        p("Madrugada", 50, 800),
        p("G", 50, 760),
        p("D", 124, 760),
        p("Quando a", 50, 748, 70),
        p("cidade", 124, 748, 40),
        // vão grande: estrofe nova
        p("Em", 50, 700),
        p("Outra estrofe", 50, 688),
      ],
    ]);
    expect(texto).toBe(["Madrugada", "", "G        D", "Quando a cidade", "", "Em", "Outra estrofe"].join("\n"));
  });

  it("tira cabeçalho e rodapé repetidos em toda página", () => {
    const pagina = (verso: string, n: number) => [
      p("cifraclub.com.br", 50, 820),
      p(verso, 50, 700),
      p(`Página ${n} de 2`, 50, 40),
    ];
    expect(textoDosPedacos([pagina("um verso", 1), pagina("outro verso", 2)])).toBe("um verso\n\noutro verso");
  });
});

/** Lê um PDF de verdade com o pdf.js, como a importação faz (sem o worker do Vite). */
async function pedacosDe(bytes: Uint8Array): Promise<PedacoDoPdf[][]> {
  const { createRequire } = await import("node:module");
  const { pathToFileURL } = await import("node:url");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(createRequire(import.meta.url).resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")).href;
  const pdf = await pdfjs.getDocument({ data: bytes, verbosity: 0 }).promise;
  const paginas: PedacoDoPdf[][] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const c = await (await pdf.getPage(n)).getTextContent();
    paginas.push(
      c.items.flatMap((i) =>
        "str" in i && i.str
          ? [
              {
                texto: i.str,
                x: i.transform[4] as number,
                y: i.transform[5] as number,
                largura: i.width,
                altura: i.height,
                mono: c.styles[i.fontName]?.fontFamily === "monospace",
              },
            ]
          : [],
      ),
    );
  }
  return paginas;
}

describe("PDF de verdade", () => {
  it("o PDF exportado pelo Compoze volta igual", async () => {
    const { paraPdf, OPCOES_PADRAO } = await import("@/lib/exportar");
    const { lerCancao } = await import("@/lib/importar");
    const bytes = await paraPdf(
      {
        titulo: "Madrugada",
        tom: "Am",
        bpm: 78,
        compasso: "4/4",
        coautoria: [{ nome: "Lara", percentual: 100 }],
        blocos: [
          { id: "1", type: "section", label: "Verso 1", text: "", authorId: null },
          { id: "2", type: "chord-line", text: "Am          F            C7M(9)", authorId: null },
          { id: "3", type: "lyric-line", text: "Café esfriou na xícara, a cidade respira", authorId: null },
          { id: "4", type: "note", text: "Trocar rua por avenida?", authorId: null },
          { id: "5", type: "section", label: "Refrão", text: "", authorId: null },
          { id: "6", type: "lyric-line", text: "Madrugada inteira\neu te invento de novo", authorId: null },
        ],
      },
      OPCOES_PADRAO,
    );
    const c = lerCancao(textoDosPedacos(await pedacosDe(bytes)), "texto", "Madrugada");
    expect(c).toMatchObject({ titulo: "Madrugada", tom: "Am", bpm: 78, compasso: "4/4" });
    expect(c.blocos).toEqual([
      { type: "section", label: "Verso 1", text: "" },
      { type: "chord-line", text: "Am          F            C7M(9)" },
      { type: "lyric-line", text: "Café esfriou na xícara, a cidade respira" },
      { type: "note", text: "Trocar rua por avenida?" },
      { type: "section", label: "Refrão", text: "" },
      { type: "lyric-line", text: "Madrugada inteira\neu te invento de novo" },
    ]);
  });

  it("com fonte proporcional, o acorde cai na sílaba em que estava", async () => {
    // Como um site de cifras imprime: letra em Helvetica e cada acorde
    // posicionado em cima da sílaba, pela largura do texto antes dela.
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    const verso = "Wwww mmm iii cidade";
    const x0 = 60;
    pdf.text(verso, x0, 120);
    for (const [acorde, antes] of [["G", "Wwww "], ["D", "Wwww mmm iii "]] as const) {
      pdf.text(acorde, x0 + pdf.getTextWidth(antes), 106);
    }
    const ped = await pedacosDe(new Uint8Array(pdf.output("arraybuffer")));
    const texto = textoDosPedacos(ped);
    const [cifra, letra] = texto.split("\n");
    expect(letra).toBe(verso);
    expect(cifra!.indexOf("G")).toBe(verso.indexOf("mmm"));
    expect(cifra!.indexOf("D")).toBe(verso.indexOf("cidade"));
  });
});
