import { semear, Y } from "@compoze/documento";
import { IndexeddbPersistence } from "y-indexeddb";
import { nomeLocal } from "@/lib/colaboracao";
import { uuidv7 } from "@/lib/uuidv7";

/**
 * Folha pautada de uma canção nova (seção "Verso 1" e uma linha), escrita
 * direto no documento do aparelho.
 *
 * O app cria a canção com `folha_pautada: false` e monta a folha aqui, para
 * que só um lado semeie o documento (ADR 0008). Funciona offline: a canção
 * abre no editor na hora e o documento sobe quando houver rede.
 */
export async function semearFolhaInicial(songId: string, autorId: string): Promise<void> {
  const doc = new Y.Doc();
  const local = new IndexeddbPersistence(nomeLocal(songId), doc);
  try {
    await local.whenSynced;
    semear(doc, [
      { id: uuidv7(), type: "SECTION", label: "Verso 1", content: "", author_id: autorId },
      { id: uuidv7(), type: "LYRIC", label: null, content: "", author_id: autorId },
    ]);
  } finally {
    await local.destroy();
    doc.destroy();
  }
}
