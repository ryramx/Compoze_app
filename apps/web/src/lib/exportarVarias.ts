import { lerBlocos, Y } from "@compoze/documento";
import { zipSync } from "fflate";
import { nomeLocal } from "@/lib/colaboracao";
import { exportar, type CancaoParaExportar, type FormatoDeExportacao, type OpcoesDeExportacao } from "@/lib/exportar";
import { rotuloDoEstagio } from "@/lib/rotulos";
import { blocoDoDocumento } from "@/services/api/adapters";
import * as songApi from "@/services/api/songService";
import type { Song, SongBlock, User } from "@/types";

/**
 * Exportar várias canções de uma vez, num .zip (ADR 0025).
 *
 * Os arquivos são gerados no aparelho, como na exportação de uma canção. O
 * servidor só entra para entregar o texto de uma canção que nunca foi aberta
 * neste aparelho, e mesmo assim no máximo `SIMULTANEAS` pedidos por vez. O
 * teto por lote protege o celular (memória para o PDF de cada uma e o zip) e
 * o servidor gratuito (Render + Neon), que acorda devagar e tem pouca folga.
 */
export const MAXIMO_POR_LOTE = 50;
const SIMULTANEAS = 3;

/** O nome do documento local existe? Abrir um que não existe criaria um vazio à toa. */
async function temCopiaLocal(songId: string): Promise<boolean> {
  try {
    if (typeof indexedDB.databases !== "function") return true;
    const bancos = await indexedDB.databases();
    return bancos.some((b) => b.name === nomeLocal(songId));
  } catch {
    return false;
  }
}

/**
 * A letra de uma canção, de onde estiver mais à mão: a cópia do documento
 * Yjs no aparelho (a mais fiel, inclui o que ainda não subiu), os blocos que
 * a tela já tem, ou o servidor.
 */
export async function blocosDaCancao(musica: Song): Promise<SongBlock[]> {
  if (await temCopiaLocal(musica.id)) {
    const { IndexeddbPersistence } = await import("y-indexeddb");
    const doc = new Y.Doc();
    const local = new IndexeddbPersistence(nomeLocal(musica.id), doc);
    try {
      await local.whenSynced;
      const blocos = lerBlocos(doc).map(blocoDoDocumento);
      if (blocos.length > 0) return blocos;
    } finally {
      await local.destroy();
      doc.destroy();
    }
  }
  if (musica.blocks.length > 0) return musica.blocks;
  return (await songApi.getById(musica.id)).blocks;
}

export function cancaoParaExportar(musica: Song, blocos: SongBlock[], getUser: (id: string) => User | undefined): CancaoParaExportar {
  return {
    titulo: musica.title,
    tom: musica.key,
    bpm: musica.bpm,
    compasso: musica.timeSignature,
    estagio: rotuloDoEstagio(musica.status),
    coautoria: musica.collaborators.map((c) => ({ nome: getUser(c.userId)?.name ?? "Alguém", percentual: c.percentage })),
    blocos,
  };
}

/** "Rua.pdf", "Rua (2).pdf": duas canções com o mesmo título não se sobrescrevem no zip. */
function semRepetir(nome: string, usados: Set<string>): string {
  if (!usados.has(nome.toLowerCase())) {
    usados.add(nome.toLowerCase());
    return nome;
  }
  const ponto = nome.lastIndexOf(".");
  for (let n = 2; ; n++) {
    const outro = `${nome.slice(0, ponto)} (${n})${nome.slice(ponto)}`;
    if (!usados.has(outro.toLowerCase())) {
      usados.add(outro.toLowerCase());
      return outro;
    }
  }
}

export interface ResultadoDoLote {
  nome: string;
  tipo: string;
  bytes: Uint8Array;
  /** Títulos que não entraram (sem internet e sem cópia no aparelho, por exemplo). */
  faltaram: string[];
}

export async function exportarVarias(
  musicas: Song[],
  formato: FormatoDeExportacao,
  opcoes: OpcoesDeExportacao,
  getUser: (id: string) => User | undefined,
  aoAvancar?: (prontas: number, total: number) => void,
  lerBlocos: (m: Song) => Promise<SongBlock[]> = blocosDaCancao,
): Promise<ResultadoDoLote> {
  if (musicas.length === 0) throw new Error("Nenhuma canção escolhida.");
  if (musicas.length > MAXIMO_POR_LOTE) throw new Error(`No máximo ${MAXIMO_POR_LOTE} canções por vez.`);

  const arquivos: ({ nome: string; bytes: Uint8Array } | null)[] = new Array(musicas.length).fill(null);
  const faltaram: string[] = [];
  let proxima = 0;
  let prontas = 0;

  // Algumas por vez, na ordem da lista: o zip sai na mesma ordem da tela.
  const trabalhar = async () => {
    while (proxima < musicas.length) {
      const i = proxima++;
      const m = musicas[i]!;
      try {
        const arquivo = await exportar(formato, cancaoParaExportar(m, await lerBlocos(m), getUser), opcoes);
        arquivos[i] = { nome: arquivo.nome, bytes: arquivo.bytes };
      } catch {
        faltaram.push(m.title || "Sem título");
      }
      aoAvancar?.(++prontas, musicas.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(SIMULTANEAS, musicas.length) }, trabalhar));

  const usados = new Set<string>();
  const conteudo: Record<string, Uint8Array> = {};
  for (const a of arquivos) if (a) conteudo[semRepetir(a.nome, usados)] = new Uint8Array(a.bytes);
  if (Object.keys(conteudo).length === 0) throw new Error("Nenhuma canção pôde ser exportada.");

  const n = Object.keys(conteudo).length;
  return {
    // Sem acento no nome do zip: alguns navegadores trocam um nome com "ç"
    // por "download". Os arquivos de dentro levam o título como está.
    nome: `Compoze - ${n} ${n === 1 ? "cancao" : "cancoes"}.zip`,
    tipo: "application/zip",
    // PDF e Word já vêm comprimidos; comprimir de novo só gastaria bateria.
    bytes: zipSync(conteudo, { level: formato === "pdf" || formato === "word" ? 0 : 6 }),
    faltaram,
  };
}
