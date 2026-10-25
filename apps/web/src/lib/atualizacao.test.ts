import { describe, expect, it } from "vitest";
import { maisNova } from "./atualizacao";

describe("maisNova", () => {
  it("compara número a número, não como texto", () => {
    expect(maisNova("0.10.0", "0.9.9")).toBe(true);
    expect(maisNova("v1.0.0", "0.99.99")).toBe(true);
    expect(maisNova("0.1.0", "0.1.0")).toBe(false);
    expect(maisNova("0.1.0", "0.1.1")).toBe(false);
    expect(maisNova("0.2", "0.1.9")).toBe(true);
  });
});
