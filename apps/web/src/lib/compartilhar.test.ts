import { describe, expect, it } from "vitest";
import { lerCompartilhado } from "./compartilhar";

describe("lerCompartilhado", () => {
  it("separa estrofes nas linhas em branco e usa a primeira linha como título", () => {
    const ideia = lerCompartilhado({ text: "Lua de março\nno telhado\r\n\r\nvento que leva\n\n\n" });
    expect(ideia).toEqual({ titulo: "Lua de março", estrofes: ["Lua de março\nno telhado", "vento que leva"] });
  });

  it("prefere o título compartilhado, menos quando ele repete o texto", () => {
    expect(lerCompartilhado({ title: "Nota de ontem", text: "um verso" })?.titulo).toBe("Nota de ontem");
    expect(lerCompartilhado({ title: "um verso", text: "um verso" })?.titulo).toBe("um verso");
  });

  it("junta o link ao texto sem repetir", () => {
    expect(lerCompartilhado({ text: "ouve isso", url: "https://x.y/z" })?.estrofes).toEqual(["ouve isso", "https://x.y/z"]);
    expect(lerCompartilhado({ text: "ouve https://x.y/z", url: "https://x.y/z" })?.estrofes).toEqual(["ouve https://x.y/z"]);
  });

  it("encurta título longo na última palavra inteira", () => {
    const linha = "uma frase comprida demais para caber inteira no título de uma canção nova";
    const { titulo } = lerCompartilhado({ text: linha })!;
    expect(titulo.length).toBeLessThanOrEqual(61);
    expect(titulo.endsWith("…")).toBe(true);
    expect(linha.startsWith(titulo.slice(0, -1))).toBe(true);
  });

  it("devolve null quando não veio nada", () => {
    expect(lerCompartilhado({ text: "  \n " })).toBeNull();
    expect(lerCompartilhado({})).toBeNull();
  });
});
