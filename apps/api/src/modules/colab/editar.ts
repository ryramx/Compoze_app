import { nomeDoDocumento, type Y } from "@compoze/documento";

import type { Colaboracao } from "./servidor";

/**
 * Aplica uma mudança no documento de uma canção pelo lado do servidor (rotas
 * REST de blocos). Usa o mesmo documento em memória que os editores abertos
 * estão vendo, então a mudança chega a eles na hora; ao terminar, grava e
 * refaz a projeção em `song_blocks` antes de devolver.
 */
export async function editarDocumento<T>(
  colab: Colaboracao,
  songId: string,
  usuarioId: string,
  mudanca: (doc: Y.Doc) => T,
): Promise<T> {
  const conexao = await colab.openDirectConnection(nomeDoDocumento(songId), { usuarioId });
  try {
    let resultado!: T;
    await conexao.transact((doc) => {
      resultado = mudanca(doc);
    });
    return resultado;
  } finally {
    await conexao.disconnect();
  }
}
