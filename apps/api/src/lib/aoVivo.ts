import type { EventoAoVivo } from "@compoze/contracts";

/**
 * Quem está com o app aberto agora (Fase 4b, ADR 0014). Cada fluxo
 * `GET /events` se registra aqui pela pessoa; `avisar` entrega um evento a
 * todos os aparelhos dela.
 *
 * Fica na memória do processo: o staging roda uma instância só. Com mais de
 * uma, isto vira LISTEN/NOTIFY do Postgres, sem mudar quem chama `avisar`.
 */
export type Ouvinte = (e: EventoAoVivo) => void;

export function criarAoVivo() {
  const porPessoa = new Map<string, Set<Ouvinte>>();
  return {
    ouvir(userId: string, f: Ouvinte): () => void {
      const set = porPessoa.get(userId) ?? new Set();
      set.add(f);
      porPessoa.set(userId, set);
      return () => {
        set.delete(f);
        if (set.size === 0) porPessoa.delete(userId);
      };
    },
    avisar(userIds: Iterable<string>, e: EventoAoVivo): void {
      for (const id of userIds) for (const f of porPessoa.get(id) ?? []) f(e);
    },
    /** Quantos fluxos abertos (para os testes e o /health, se precisar). */
    abertos: () => [...porPessoa.values()].reduce((n, s) => n + s.size, 0),
  };
}

export type AoVivo = ReturnType<typeof criarAoVivo>;
