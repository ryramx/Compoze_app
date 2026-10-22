import { describe, expect, it } from "vitest";
import { uuidv7 } from "@/lib/uuidv7";

describe("uuidv7", () => {
  it("tem o formato de UUID v7 e carrega o instante", () => {
    const id = uuidv7(Date.UTC(2026, 9, 22));
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(parseInt(id.replace(/-/g, "").slice(0, 12), 16)).toBe(Date.UTC(2026, 9, 22));
  });

  it("ids posteriores ordenam depois", () => {
    expect(uuidv7(1000) < uuidv7(2000)).toBe(true);
  });
});
