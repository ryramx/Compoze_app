import { describe, expect, it } from "vitest";

import { bytesDaChave } from "./avisos";

describe("avisos", () => {
  it("converte a chave VAPID de base64url para bytes", () => {
    // "ab?" em base64 é "YWI/"; em base64url, "YWI_" sem preenchimento.
    expect([...bytesDaChave("YWI_")]).toEqual([0x61, 0x62, 0x3f]);
    expect([...bytesDaChave("YQ")]).toEqual([0x61]);
  });
});
