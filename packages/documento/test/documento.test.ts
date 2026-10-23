import { describe, expect, it } from "vitest";
import {
  Y,
  editarTexto,
  idDaCancao,
  inserirBloco,
  lerBlocos,
  mudarBloco,
  nomeDoDocumento,
  removerBloco,
  semear,
  substituirBlocos,
} from "../src/index";

const novo = (id: string, content = "") => ({ id, type: "LYRIC" as const, label: null, content, author_id: "u1" });

/** Liga dois documentos como se fossem dois aparelhos sincronizados. */
function sincronizar(a: Y.Doc, b: Y.Doc) {
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a, Y.encodeStateVector(b)));
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b, Y.encodeStateVector(a)));
}

describe("documento da canção", () => {
  it("nome do documento ida e volta", () => {
    expect(idDaCancao(nomeDoDocumento("abc"))).toBe("abc");
    expect(idDaCancao("outra:abc")).toBeNull();
  });

  it("insere no fim, numa posição e ignora id repetido", () => {
    const doc = new Y.Doc();
    inserirBloco(doc, novo("a"));
    inserirBloco(doc, novo("c"));
    inserirBloco(doc, novo("b"), 1);
    inserirBloco(doc, novo("a", "duplicado"));
    expect(lerBlocos(doc).map((b) => b.id)).toEqual(["a", "b", "c"]);
    expect(lerBlocos(doc)[0]!.content).toBe("");
  });

  it("edita texto, rótulo e tipo; remove", () => {
    const doc = new Y.Doc();
    inserirBloco(doc, novo("a", "café"));
    editarTexto(doc, "a", "café frio");
    mudarBloco(doc, "a", { label: "Verso", type: "NOTE" });
    expect(lerBlocos(doc)[0]).toMatchObject({ content: "café frio", label: "Verso", type: "NOTE" });
    expect(removerBloco(doc, "a")).toBe(true);
    expect(removerBloco(doc, "a")).toBe(false);
    expect(lerBlocos(doc)).toEqual([]);
  });

  it("duas pessoas editando o mesmo verso offline: as duas edições ficam", () => {
    const lara = new Y.Doc();
    inserirBloco(lara, novo("v", "a cidade respira"));
    const joao = new Y.Doc();
    sincronizar(lara, joao);

    // Cada uma muda uma ponta do verso, sem ver a outra.
    editarTexto(lara, "v", "a cidade respira sem mim");
    editarTexto(joao, "v", "e a cidade respira");
    sincronizar(lara, joao);

    expect(lerBlocos(lara)[0]!.content).toBe("e a cidade respira sem mim");
    expect(lerBlocos(joao)).toEqual(lerBlocos(lara));
  });

  it("blocos criados offline em dois aparelhos não se perdem", () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    inserirBloco(a, novo("x", "do ônibus"));
    inserirBloco(b, novo("y", "do estúdio"));
    sincronizar(a, b);
    expect(lerBlocos(a).map((x) => x.id).sort()).toEqual(["x", "y"]);
  });

  it("semear só preenche documento vazio", () => {
    const doc = new Y.Doc();
    semear(doc, [novo("a", "um"), novo("b", "dois")]);
    semear(doc, [novo("z")]);
    expect(lerBlocos(doc).map((b) => b.content)).toEqual(["um", "dois"]);
  });

  it("substituir troca tudo numa transação, e um desfazer volta tudo", () => {
    const doc = new Y.Doc();
    semear(doc, [novo("a", "agora"), novo("b", "e mais")]);
    const desfazer = new Y.UndoManager(doc.getArray("blocos"), { trackedOrigins: new Set(["eu"]) });
    substituirBlocos(doc, [novo("v", "da versão 3")], "eu");
    expect(lerBlocos(doc).map((b) => b.content)).toEqual(["da versão 3"]);
    desfazer.undo();
    expect(lerBlocos(doc).map((b) => b.content)).toEqual(["agora", "e mais"]);
  });
});
