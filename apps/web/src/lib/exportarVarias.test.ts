import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { OPCOES_PADRAO } from "@/lib/exportar";
import { exportarVarias, MAXIMO_POR_LOTE } from "@/lib/exportarVarias";
import type { Song } from "@/types";

const musica = (id: string, title: string): Song => ({
  id,
  title,
  status: "escrita",
  creatorId: "u1",
  collaborators: [{ userId: "u1", percentage: 100 }],
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  blocks: [{ id: `${id}-1`, type: "lyric-line", text: `Verso de ${title}`, authorId: "u1" }],
});

const usuario = () => undefined;
const blocosDaLista = async (m: Song) => m.blocks;

describe("exportarVarias", () => {
  it("um arquivo por canção num zip, na ordem da lista, sem nomes repetidos", async () => {
    const avancos: number[] = [];
    const r = await exportarVarias(
      [musica("a", "Rua"), musica("b", "Madrugada"), musica("c", "Rua")],
      "markdown",
      OPCOES_PADRAO,
      usuario,
      (p) => avancos.push(p),
      blocosDaLista,
    );
    expect(r.nome).toBe("Compoze - 3 cancoes.zip");
    expect(r.faltaram).toEqual([]);
    const arquivos = unzipSync(r.bytes);
    expect(Object.keys(arquivos)).toEqual(["Rua.md", "Madrugada.md", "Rua (2).md"]);
    expect(strFromU8(arquivos["Madrugada.md"]!)).toContain("Verso de Madrugada");
    expect(avancos).toEqual([1, 2, 3]);
  });

  it("a canção que não carrega fica de fora e é avisada", async () => {
    const r = await exportarVarias([musica("a", "Rua"), musica("b", "Sem rede")], "html", OPCOES_PADRAO, usuario, undefined, async (m) => {
      if (m.id === "b") throw new Error("offline");
      return m.blocks;
    });
    expect(Object.keys(unzipSync(r.bytes))).toEqual(["Rua.html"]);
    expect(r.faltaram).toEqual(["Sem rede"]);
  });

  it(`recusa mais de ${MAXIMO_POR_LOTE} por vez`, async () => {
    const muitas = Array.from({ length: MAXIMO_POR_LOTE + 1 }, (_, i) => musica(String(i), `C${i}`));
    await expect(exportarVarias(muitas, "markdown", OPCOES_PADRAO, usuario, undefined, blocosDaLista)).rejects.toThrow(/No máximo/);
  });

  it("não vai ao servidor mais de 3 vezes ao mesmo tempo", async () => {
    let agora = 0;
    let pico = 0;
    await exportarVarias(
      Array.from({ length: 10 }, (_, i) => musica(String(i), `C${i}`)),
      "markdown",
      OPCOES_PADRAO,
      usuario,
      undefined,
      async (m) => {
        pico = Math.max(pico, ++agora);
        await new Promise((r) => setTimeout(r, 5));
        agora--;
        return m.blocks;
      },
    );
    expect(pico).toBe(3);
  });
});
