import type { AtualizarLancamento, Lancamento, NovoLancamento } from "@compoze/contracts";
import { projectEntries, projects, type Banco } from "@compoze/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";

import { ErroDaApi } from "../../plugins/erros";

/**
 * Livro-caixa do projeto (ADR 0021). Só a dona vê e mexe, como no resto da
 * ficha do projeto. Entrada mexe no `funding_current` na mesma transação, para
 * o arrecadado nunca divergir da soma do que foi lançado e confirmado.
 */

type Tx = Parameters<Parameters<Banco["transaction"]>[0]>[0];
type Linha = typeof projectEntries.$inferSelect;

function lancamento(l: Linha): Lancamento {
  return {
    id: l.id,
    project_id: l.projectId,
    kind: l.kind,
    description: l.description,
    category: l.category,
    amount: l.amount,
    occurred_on: l.occurredOn,
    created_at: l.createdAt.toISOString(),
    updated_at: l.updatedAt.toISOString(),
  };
}

/** Trava o projeto (da dona e fora da lixeira) para a soma do arrecadado não se perder. */
async function travarProjeto(tx: Tx, projetoId: string, donaId: string) {
  const [p] = await tx
    .select({ deletedAt: projects.deletedAt })
    .from(projects)
    .where(and(eq(projects.id, projetoId), eq(projects.ownerId, donaId)))
    .for("update");
  if (!p) throw new ErroDaApi(404, "Projeto não encontrado.");
  if (p.deletedAt) throw new ErroDaApi(409, "O projeto está na lixeira. Restaure antes de lançar valores.");
}

async function somarNoArrecadado(tx: Tx, projetoId: string, delta: number) {
  if (delta === 0) return;
  await tx
    .update(projects)
    // Nunca abaixo de zero: o CHECK do projeto recusaria, e um apoio por PIX
    // recusado depois não deve travar a exclusão de uma entrada.
    .set({ fundingCurrent: sql`greatest(${projects.fundingCurrent} + ${delta}, 0)` })
    .where(eq(projects.id, projetoId));
}

export async function listar(db: Banco, projetoId: string, donaId: string): Promise<Lancamento[]> {
  const [p] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projetoId), eq(projects.ownerId, donaId)));
  if (!p) throw new ErroDaApi(404, "Projeto não encontrado.");
  const linhas = await db
    .select()
    .from(projectEntries)
    .where(eq(projectEntries.projectId, projetoId))
    .orderBy(desc(projectEntries.occurredOn), asc(projectEntries.createdAt));
  return linhas.map(lancamento);
}

export async function criar(db: Banco, projetoId: string, donaId: string, d: NovoLancamento & { amount: number }) {
  return db.transaction(async (tx) => {
    await travarProjeto(tx, projetoId, donaId);
    // Com id do aparelho, repetir o envio devolve o mesmo lançamento (ADR 0005).
    if (d.id) {
      const [ja] = await tx.select().from(projectEntries).where(eq(projectEntries.id, d.id));
      if (ja) {
        if (ja.projectId !== projetoId) throw new ErroDaApi(409, "Esse id já é de outro lançamento.");
        return lancamento(ja);
      }
    }
    const [l] = await tx
      .insert(projectEntries)
      .values({
        ...(d.id ? { id: d.id } : {}),
        projectId: projetoId,
        kind: d.kind,
        description: d.description,
        category: d.category || null,
        amount: d.amount,
        occurredOn: d.occurred_on ?? null,
      })
      .returning();
    if (d.kind === "ENTRADA") await somarNoArrecadado(tx, projetoId, d.amount);
    return lancamento(l!);
  });
}

async function doProjeto(tx: Tx, projetoId: string, id: string) {
  const [l] = await tx
    .select()
    .from(projectEntries)
    .where(and(eq(projectEntries.id, id), eq(projectEntries.projectId, projetoId)))
    .for("update");
  if (!l) throw new ErroDaApi(404, "Lançamento não encontrado.");
  return l;
}

export async function atualizar(db: Banco, projetoId: string, donaId: string, id: string, d: AtualizarLancamento) {
  return db.transaction(async (tx) => {
    await travarProjeto(tx, projetoId, donaId);
    const antes = await doProjeto(tx, projetoId, id);
    const m: Partial<typeof projectEntries.$inferInsert> = {};
    if (d.description !== undefined) m.description = d.description;
    if (d.category !== undefined) m.category = d.category || null;
    if (d.amount !== undefined) m.amount = d.amount;
    if (d.occurred_on !== undefined) m.occurredOn = d.occurred_on;
    if (Object.keys(m).length === 0) return lancamento(antes);
    const [l] = await tx.update(projectEntries).set(m).where(eq(projectEntries.id, id)).returning();
    if (antes.kind === "ENTRADA") await somarNoArrecadado(tx, projetoId, l!.amount - antes.amount);
    return lancamento(l!);
  });
}

export async function remover(db: Banco, projetoId: string, donaId: string, id: string) {
  await db.transaction(async (tx) => {
    await travarProjeto(tx, projetoId, donaId);
    const l = await doProjeto(tx, projetoId, id);
    await tx.delete(projectEntries).where(eq(projectEntries.id, id));
    if (l.kind === "ENTRADA") await somarNoArrecadado(tx, projetoId, -l.amount);
  });
}
