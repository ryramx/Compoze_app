import { semear, Y } from "@compoze/documento";
import { IndexeddbPersistence } from "y-indexeddb";
import { nomeLocal } from "@/lib/colaboracao";
import type { BlocoImportado } from "@/lib/importar";
import { uuidv7 } from "@/lib/uuidv7";
import { tipoDeBlocoParaApi } from "@/services/api/adapters";

/**
 * Folha pautada de uma canção nova (seção "Verso 1" e uma linha), escrita
 * direto no documento do aparelho. Com `estrofes` (texto que chegou de outro
 * app, Fase 3b), cada estrofe vira um bloco de letra no lugar da linha vazia.
 *
 * O app cria a canção com `folha_pautada: false` e monta a folha aqui, para
 * que só um lado semeie o documento (ADR 0008). Funciona offline: a canção
 * abre no editor na hora e o documento sobe quando houver rede.
 */
export async function semearFolhaInicial(
  songId: string,
  autorId: string,
  estrofes: string[] = [],
  blocos?: BlocoImportado[],
): Promise<void> {
  const doc = new Y.Doc();
  const local = new IndexeddbPersistence(nomeLocal(songId), doc);
  try {
    await local.whenSynced;
    if (blocos && blocos.length > 0) {
      semear(doc, blocosParaODocumento(blocos, autorId));
      return;
    }
    const letra = estrofes.length > 0 ? estrofes : [""];
    semear(doc, [
      { id: uuidv7(), type: "SECTION", label: "Verso 1", content: "", author_id: autorId },
      ...letra.map((content) => ({ id: uuidv7(), type: "LYRIC" as const, label: null, content, author_id: autorId })),
    ]);
  } finally {
    await local.destroy();
    doc.destroy();
  }
}

/** Blocos importados no formato do documento, todos de quem importou. */
export function blocosParaODocumento(blocos: BlocoImportado[], autorId: string) {
  return blocos.map((b) => ({
    id: uuidv7(),
    type: tipoDeBlocoParaApi(b.type),
    label: b.type === "section" ? (b.label ?? "") : null,
    content: b.type === "section" ? "" : b.text,
    author_id: autorId,
  }));
}
