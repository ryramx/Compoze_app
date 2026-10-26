import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ URL_DA_API: "https://api.exemplo" }));

const { areaDoRecorte, enderecoDaImagem, medidas } = await import("./imagens");

describe("imagens", () => {
  it("resolve o caminho da API e deixa o resto como veio", () => {
    expect(enderecoDaImagem("/images/0190-abc")).toBe("https://api.exemplo/images/0190-abc");
    expect(enderecoDaImagem("https://cdn.exemplo/foto.jpg")).toBe("https://cdn.exemplo/foto.jpg");
    expect(enderecoDaImagem("data:image/webp;base64,AAA")).toBe("data:image/webp;base64,AAA");
    expect(enderecoDaImagem(null)).toBe("");
  });

  it("reduz pelo lado maior e nunca amplia", () => {
    expect(medidas(4000, 3000, 1200)).toEqual({ largura: 1200, altura: 900 });
    expect(medidas(3000, 4000, 512)).toEqual({ largura: 384, altura: 512 });
    expect(medidas(300, 200, 512)).toEqual({ largura: 300, altura: 200 });
  });

  it("recorta a maior moldura que cabe, centrada, e aproxima pelo zoom", () => {
    // Retrato 3000x4000 numa capa 3:1: a largura toda, um terço de altura.
    expect(areaDoRecorte({ largura: 3000, altura: 4000 }, 3, 1, 1500, 2000)).toEqual({ x: 0, y: 1500, largura: 3000, altura: 1000 });
    // Paisagem 4000x3000 num avatar: o quadrado de 3000 no meio.
    expect(areaDoRecorte({ largura: 4000, altura: 3000 }, 1, 1, 2000, 1500)).toEqual({ x: 500, y: 0, largura: 3000, altura: 3000 });
    expect(areaDoRecorte({ largura: 4000, altura: 3000 }, 1, 2, 2000, 1500)).toEqual({ x: 1250, y: 750, largura: 1500, altura: 1500 });
  });

  it("não deixa a moldura sair da foto", () => {
    expect(areaDoRecorte({ largura: 3000, altura: 4000 }, 3, 1, -500, 9999)).toEqual({ x: 0, y: 3000, largura: 3000, altura: 1000 });
    expect(areaDoRecorte({ largura: 4000, altura: 3000 }, 1, 1, 9999, 0)).toEqual({ x: 1000, y: 0, largura: 3000, altura: 3000 });
  });
});
