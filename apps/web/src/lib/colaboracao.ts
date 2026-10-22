import { MODO_DEMO } from "@/lib/api";

/**
 * Endereço do WebSocket de edição em tempo real (Hocuspocus, ADR 0007). Fica
 * na mesma origem da API, em `/collab`.
 */
export const URL_COLAB = MODO_DEMO
  ? null
  : `${String(import.meta.env.VITE_API_URL).replace(/^http/, "ws").replace(/\/$/, "")}/collab`;

/** Prefixo dos bancos IndexedDB que guardam o documento de cada canção. */
const PREFIXO_LOCAL = "compoze:cancao:";

export const nomeLocal = (songId: string) => `${PREFIXO_LOCAL}${songId}`;

/**
 * Apaga as cópias locais das canções. Ao sair da conta (o próximo a usar o
 * aparelho não deve ver as letras de quem saiu) e ao restaurar os dados de
 * exemplo da demonstração.
 */
export async function apagarDocumentosLocais(): Promise<void> {
  try {
    const bancos = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      bancos
        .map((b) => b.name)
        .filter((n): n is string => !!n && n.startsWith(PREFIXO_LOCAL))
        .map(
          (n) =>
            new Promise<void>((resolve) => {
              const r = indexedDB.deleteDatabase(n);
              r.onsuccess = r.onerror = r.onblocked = () => resolve();
            }),
        ),
    );
  } catch {
    // Sem IndexedDB não há cópia local para apagar.
  }
}
