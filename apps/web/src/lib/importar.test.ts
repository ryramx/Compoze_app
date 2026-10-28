import { describe, expect, it } from "vitest";
import { ehAcorde, ehLinhaDeCifra, lerCancao, lerSecao, resumoDaImportacao, separarAcordesDoVerso, tituloDoArquivo } from "@/lib/importar";

describe("acordes", () => {
  it.each(["G", "Am", "Am7(9)", "G7M", "C#m7(b5)", "D/F#", "E7(4)", "Bº", "F#m7/E", "Asus4", "Cadd9", "Bb", "Dm7/C", "A4", "C9", "(G)", "E7(#9)"])(
    "%s é acorde",
    (a) => expect(ehAcorde(a)).toBe(true),
  );
  it.each(["Em cada", "Agora", "Amor", "Do", "Ela", "Cidade", "H", "Bom"])("%s não é acorde", (a) => expect(ehAcorde(a)).toBe(false));

  it("linha de cifra é só acordes, barras e repetições", () => {
    expect(ehLinhaDeCifra("  G        D/F#     Em7   C9")).toBe(true);
    expect(ehLinhaDeCifra("| Am  F | C  G | (2x)")).toBe(true);
    expect(ehLinhaDeCifra("E agora, José?")).toBe(false);
    expect(ehLinhaDeCifra("Em cada esquina")).toBe(false);
    expect(ehLinhaDeCifra("A")).toBe(true);
  });
});

describe("seções", () => {
  it("lê os jeitos comuns de nomear seção", () => {
    expect(lerSecao("[Refrão]")).toEqual({ rotulo: "Refrão", resto: "" });
    expect(lerSecao("[Intro] C  G  Am  F")).toEqual({ rotulo: "Intro", resto: "C  G  Am  F" });
    expect(lerSecao("REFRÃO:")).toEqual({ rotulo: "REFRÃO", resto: "" });
    expect(lerSecao("Verso 2")).toEqual({ rotulo: "Verso 2", resto: "" });
    expect(lerSecao("Pré-refrão")).toEqual({ rotulo: "Pré-refrão", resto: "" });
    expect(lerSecao("Ponte (2x):")).toEqual({ rotulo: "Ponte (2x)", resto: "" });
    expect(lerSecao("Quando a cidade dorme")).toBeNull();
    expect(lerSecao("[G]")).toBeNull();
  });
});

describe("acordes entre colchetes", () => {
  it("põe o acorde sobre a sílaba em que estava", () => {
    expect(separarAcordesDoVerso("[G]Quando a ci[D]dade dorme")).toEqual({
      cifra: "G          D",
      verso: "Quando a cidade dorme",
    });
  });
  it("acordes colados andam para a direita sem mexer no verso", () => {
    expect(separarAcordesDoVerso("[Am7][D9]Vem")).toEqual({ cifra: "Am7 D9", verso: "Vem" });
  });
  it("colchete que não é acorde não é cifra", () => {
    expect(separarAcordesDoVerso("Ela disse [risos] que sim")).toBeNull();
  });
});

describe("lerCancao", () => {
  it("cifra sobre a letra, como num site de cifras", () => {
    const c = lerCancao(
      [
        "Madrugada",
        "Tom: G",
        "",
        "[Intro] G  D  Em  C",
        "",
        "[Primeira Parte]",
        "",
        "G                D",
        "Café esfriou na xícara",
        "Em              C",
        "A cidade respira sem mim",
        "",
        "[Refrão]",
        "C          G",
        "Madrugada inteira",
        "eu te invento de novo",
      ].join("\n"),
      "texto",
      "Madrugada",
    );
    expect(c.titulo).toBe("Madrugada");
    expect(c.tom).toBe("G");
    expect(c.blocos).toEqual([
      { type: "section", label: "Intro", text: "" },
      { type: "chord-line", text: "G  D  Em  C" },
      { type: "section", label: "Primeira Parte", text: "" },
      { type: "chord-line", text: "G                D" },
      { type: "lyric-line", text: "Café esfriou na xícara" },
      { type: "chord-line", text: "Em              C" },
      { type: "lyric-line", text: "A cidade respira sem mim" },
      { type: "section", label: "Refrão", text: "" },
      { type: "chord-line", text: "C          G" },
      { type: "lyric-line", text: "Madrugada inteira\neu te invento de novo" },
    ]);
    expect(resumoDaImportacao(c)).toBe("3 seções · 4 cifras · 3 versos");
  });

  it("estrofes sem cifra viram um verso por estrofe", () => {
    const c = lerCancao("Primeira linha\nsegunda linha\n\nOutra estrofe", "texto");
    expect(c.blocos).toEqual([
      { type: "lyric-line", text: "Primeira linha\nsegunda linha" },
      { type: "lyric-line", text: "Outra estrofe" },
    ]);
  });

  it("mantém o alinhamento relativo e tira o recuo comum", () => {
    const c = lerCancao("      G     D\n    Vem comigo", "texto");
    expect(c.blocos).toEqual([
      { type: "chord-line", text: "  G     D" },
      { type: "lyric-line", text: "Vem comigo" },
    ]);
  });

  it("ChordPro: diretivas, seções e acordes no verso", () => {
    const c = lerCancao(
      [
        "{title: Asfalto azul}",
        "{artist: Lara Mendes}",
        "{key: Em}",
        "{tempo: 92}",
        "{time: 6/8}",
        "{c: Verso}",
        "[Em]Asfalto a[C]zul",
        "{soc}",
        "[G]Refrão [D]aqui",
        "{eoc}",
        "{comment: repetir duas vezes}",
      ].join("\n"),
      "texto",
    );
    expect(c).toMatchObject({ titulo: "Asfalto azul", tom: "Em", bpm: 92, compasso: "6/8" });
    expect(c.blocos).toEqual([
      { type: "note", text: "Artista: Lara Mendes" },
      { type: "section", label: "Verso", text: "" },
      { type: "chord-line", text: "Em       C" },
      { type: "lyric-line", text: "Asfalto azul" },
      { type: "section", label: "Refrão", text: "" },
      { type: "chord-line", text: "G      D" },
      { type: "lyric-line", text: "Refrão aqui" },
      { type: "note", text: "repetir duas vezes" },
    ]);
  });

  it("Markdown: título, seções, notas e cifra em bloco de código", () => {
    const c = lerCancao(
      [
        "# Rua de cima",
        "",
        "Tom: D · Compasso: 4/4 · Andamento: 84 bpm  ",
        "Estágio: Escrita · Coautoria: Lara (100%)",
        "",
        "## Verso",
        "",
        "```",
        "D       A",
        "Vou sem pressa",
        "```",
        "",
        "> Trocar *pressa* por calma?",
        "",
        "## Ponte",
        "",
        "Mesmo o **silêncio**  ",
        "tem gosto de começo",
      ].join("\n"),
      "markdown",
    );
    expect(c).toMatchObject({ titulo: "Rua de cima", tom: "D", bpm: 84, compasso: "4/4" });
    expect(c.blocos).toEqual([
      { type: "section", label: "Verso", text: "" },
      { type: "chord-line", text: "D       A" },
      { type: "lyric-line", text: "Vou sem pressa" },
      { type: "note", text: "Trocar pressa por calma?" },
      { type: "section", label: "Ponte", text: "" },
      { type: "lyric-line", text: "Mesmo o silêncio\ntem gosto de começo" },
    ]);
  });

  it("o que não cabe na ficha vira nota, para nada se perder", () => {
    const c = lerCancao("Tom: G (forma dos acordes no tom de E)\nCapo: 3ª casa\n\nVerso", "texto");
    expect(c.tom).toBe("G");
    expect(c.blocos[0]).toEqual({ type: "note", text: "Tom: G (forma dos acordes no tom de E)\nCapo: 3ª casa" });
  });

  it("sem título no texto, usa o nome do arquivo", () => {
    expect(tituloDoArquivo("minha_cancao-final.pdf")).toBe("minha cancao-final");
    expect(lerCancao("la la la", "texto", "Ensaio").titulo).toBe("Ensaio");
    expect(lerCancao("la la la", "texto").titulo).toBe("Canção importada");
  });

  it("rótulo em caixa alta é seção; \"Nota:\" é nota", () => {
    const c = lerCancao("PRIMEIRA PARTE B\nVerso aqui\nNota: segunda voz entra aqui", "texto");
    expect(c.blocos).toEqual([
      { type: "section", label: "Primeira parte b", text: "" },
      { type: "lyric-line", text: "Verso aqui" },
      { type: "note", text: "segunda voz entra aqui" },
    ]);
  });

  it("tablatura fica como cifra", () => {
    const c = lerCancao("e|-----0---|\nB|---1-----|", "texto");
    expect(c.blocos.map((b) => b.type)).toEqual(["chord-line", "chord-line"]);
  });
});

describe("cabeçalho", () => {
  it("título, autor e ficha do topo de uma cifra", () => {
    const c = lerCancao("Trem das Onze\nAdoniran Barbosa\nTom: E\n\n[Intro] E  C#7\n\nNão posso ficar", "texto", "Trem-das-onze");
    expect(c).toMatchObject({ titulo: "Trem das Onze", tom: "E" });
    expect(c.blocos).toEqual([
      { type: "note", text: "Adoniran Barbosa" },
      { type: "section", label: "Intro", text: "" },
      { type: "chord-line", text: "E  C#7" },
      { type: "lyric-line", text: "Não posso ficar" },
    ]);
  });

  it("sem ficha nem título, o primeiro parágrafo é estrofe", () => {
    const c = lerCancao("Primeira linha\nsegunda\n\nOutra", "texto", "Rascunho");
    expect(c.titulo).toBe("Rascunho");
    expect(c.blocos[0]).toEqual({ type: "lyric-line", text: "Primeira linha\nsegunda" });
  });
});

describe("cabeçalho do PDF do Compoze", () => {
  it("título e ficha em linhas seguidas, até a última linha de ficha", () => {
    const c = lerCancao("Madrugada\n\nTom: Am · Compasso: 4/4\nEstágio: Escrita\n\n[Intro] Am F\n", "texto", "outro-nome");
    expect(c).toMatchObject({ titulo: "Madrugada", tom: "Am", compasso: "4/4" });
    expect(c.blocos.map((b) => b.type)).toEqual(["section", "chord-line"]);
  });
});
