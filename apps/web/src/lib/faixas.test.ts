import { describe, expect, it } from "vitest";
import type { Project } from "@/types";
import { comFaixa, faixaComNumero, numeroDaFaixa, proximaFaixa, renumerar, semFaixa } from "./faixas";

const vazio: Project = {
  id: "p",
  name: "Disco",
  type: "ep",
  style: "banda",
  description: "",
  cover: "",
  releaseDate: "",
  estimatedCost: 0,
  fundingGoal: 0,
  fundingProgress: 0,
  status: "planejamento",
  songIds: [],
  trackNumbers: {},
  collaboratorIds: [],
  ownerId: "eu",
};

describe("números de faixa", () => {
  it("automático segue a maior; à mão pode pular", () => {
    const a = comFaixa(vazio, "a");
    expect(numeroDaFaixa(a, "a")).toBe(1);
    const b = comFaixa(a, "b", 7);
    expect(numeroDaFaixa(b, "b")).toBe(7);
    expect(proximaFaixa(b)).toBe(8);
    expect(faixaComNumero(b, 7)).toBe("b");
  });

  it("renumerar para número ocupado troca as duas e reordena", () => {
    const p = comFaixa(comFaixa(comFaixa(vazio, "a"), "b"), "c", 5);
    const r = renumerar(p, "c", 1);
    expect(r.songIds).toEqual(["c", "b", "a"]);
    expect(r.trackNumbers).toEqual({ c: 1, b: 2, a: 5 });
  });

  it("retirar e cópia antiga sem números", () => {
    const antigo = { ...vazio, songIds: ["x", "y"], trackNumbers: undefined };
    expect(numeroDaFaixa(antigo, "y")).toBe(2);
    expect(semFaixa(comFaixa(vazio, "a"), "a").songIds).toEqual([]);
  });
});
