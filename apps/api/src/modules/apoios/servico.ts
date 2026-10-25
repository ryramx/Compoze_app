import {
  normalizarChavePix,
  type Apoio,
  type ApoioComPix,
  type ApoioRecebido,
  type Aviso,
  type NovoPixDoProjeto,
  type PixDoProjeto,
  type ProjetoParaApoiar,
} from "@compoze/contracts";
import { projectContributions, projectPix, projects, users, type Banco } from "@compoze/db";
import { and, desc, eq, getTableColumns, gt, isNotNull, isNull, ne, or, sql } from "drizzle-orm";

import { usuarioPublico } from "../../lib/mapear";
import { uuidv7 } from "../../lib/uuidv7";
import { codigoPix } from "../../lib/pix";
import { ErroDaApi } from "../../plugins/erros";

/**
 * Apoio a projeto por PIX (Fase 4d, ADR 0018). O dinheiro nunca passa pelo
 * Compoze: o QR Code leva a chave da dona, quem apoia paga pelo próprio banco
 * e avisa, e a dona confirma o que viu no extrato. Só o confirmado entra em
 * `funding_current`.
 */

const { passwordHash: _hash, location: _local, ...colunasPublicas } = getTableColumns(users);
type Linha = typeof projectContributions.$inferSelect;

const apoio = (l: Linha): Apoio => ({
  id: l.id,
  project_id: l.projectId,
  supporter_id: l.supporterId,
  amount: l.amount,
  txid: l.txid,
  status: l.status,
  paid_claimed_at: l.paidClaimedAt?.toISOString() ?? null,
  decided_at: l.decidedAt?.toISOString() ?? null,
  created_at: l.createdAt.toISOString(),
});

const naoEncontrado = () => new ErroDaApi(404, "Projeto não encontrado.");

async function daDona(db: Banco, projetoId: string, donaId: string) {
  const [p] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projetoId), eq(projects.ownerId, donaId), isNull(projects.deletedAt)));
  if (!p) throw naoEncontrado();
  return p;
}

// ------------------------------------------------------------- a chave

const pixDaLinha = (l: typeof projectPix.$inferSelect): PixDoProjeto => ({
  key_type: l.keyType,
  key: l.key,
  receiver_name: l.receiverName,
  city: l.city,
  open: l.open,
});

export async function pixDoProjeto(db: Banco, projetoId: string, donaId: string): Promise<PixDoProjeto | null> {
  await daDona(db, projetoId, donaId);
  const [l] = await db.select().from(projectPix).where(eq(projectPix.projectId, projetoId));
  return l ? pixDaLinha(l) : null;
}

export async function definirPix(db: Banco, projetoId: string, donaId: string, d: NovoPixDoProjeto): Promise<PixDoProjeto> {
  await daDona(db, projetoId, donaId);
  const valores = {
    keyType: d.key_type,
    key: normalizarChavePix(d.key_type, d.key)!,
    receiverName: d.receiver_name.trim(),
    city: d.city.trim(),
    open: d.open ?? true,
    updatedAt: new Date(),
  };
  const [l] = await db
    .insert(projectPix)
    .values({ projectId: projetoId, ...valores })
    .onConflictDoUpdate({ target: projectPix.projectId, set: valores })
    .returning();
  return pixDaLinha(l!);
}

/** Tira a chave: o projeto deixa de aceitar apoio. O que já foi confirmado fica. */
export async function removerPix(db: Banco, projetoId: string, donaId: string): Promise<void> {
  await daDona(db, projetoId, donaId);
  await db.delete(projectPix).where(eq(projectPix.projectId, projetoId));
}

// ------------------------------------------------------ quem apoia

async function aberto(db: Banco, projetoId: string) {
  const [l] = await db
    .select({ projeto: projects, pix: projectPix, dona: colunasPublicas })
    .from(projects)
    .innerJoin(projectPix, eq(projectPix.projectId, projects.id))
    .innerJoin(users, eq(users.id, projects.ownerId))
    .where(and(eq(projects.id, projetoId), isNull(projects.deletedAt), eq(projectPix.open, true)));
  // Sem chave, fechado ou na lixeira: para quem apoia, o projeto não existe.
  if (!l) throw new ErroDaApi(404, "Este projeto não está recebendo apoio.");
  return l;
}

export async function paraApoiar(db: Banco, projetoId: string): Promise<ProjetoParaApoiar> {
  const { projeto: p, pix, dona } = await aberto(db, projetoId);
  const [{ n }] = (await db
    .select({ n: sql<number>`count(DISTINCT ${projectContributions.supporterId})::int` })
    .from(projectContributions)
    .where(and(eq(projectContributions.projectId, projetoId), eq(projectContributions.status, "CONFIRMADO")))) as [{ n: number }];
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    cover_url: p.coverUrl,
    type: p.type,
    owner: usuarioPublico(dona),
    funding_target: p.fundingTarget,
    funding_current: p.fundingCurrent,
    receiver_name: pix.receiverName,
    supporters: n,
  };
}

/** "CPZ" + a parte aleatória do id: único, só letras e números, até 25. */
const txidDe = (id: string) => `CPZ${id.replace(/-/g, "").slice(-22)}`.toUpperCase();

/**
 * Cria o apoio e devolve o copia e cola com o valor. O id pode vir do
 * aparelho: repetir o pedido devolve o mesmo apoio, não um segundo.
 */
export async function apoiar(db: Banco, projetoId: string, usuarioId: string, d: { id?: string; amount: number }): Promise<ApoioComPix> {
  const { projeto, pix } = await aberto(db, projetoId);
  if (projeto.ownerId === usuarioId) throw new ErroDaApi(422, "O projeto é seu: não dá para apoiar o próprio projeto.");
  const id = d.id ?? uuidv7();
  const [novo] = await db
    .insert(projectContributions)
    .values({ id, projectId: projetoId, supporterId: usuarioId, amount: d.amount, txid: txidDe(id) })
    .onConflictDoNothing()
    .returning();
  let linha = novo;
  if (!linha) {
    const [existente] = await db.select().from(projectContributions).where(eq(projectContributions.id, id));
    if (!existente || existente.supporterId !== usuarioId || existente.projectId !== projetoId) {
      throw new ErroDaApi(409, "Já existe um apoio com este id.");
    }
    linha = existente;
  }
  return {
    contribution: apoio(linha),
    pix_code: codigoPix({ chave: pix.key, nome: pix.receiverName, cidade: pix.city, valor: linha.amount, txid: linha.txid }),
  };
}

export async function meus(db: Banco, projetoId: string, usuarioId: string): Promise<Apoio[]> {
  const linhas = await db
    .select()
    .from(projectContributions)
    .where(and(eq(projectContributions.projectId, projetoId), eq(projectContributions.supporterId, usuarioId)))
    .orderBy(desc(projectContributions.createdAt));
  return linhas.map(apoio);
}

/** Quem apoiou avisa que pagou. A dona recebe um aviso para conferir. */
export async function avisarPago(
  db: Banco,
  projetoId: string,
  apoioId: string,
  usuarioId: string,
): Promise<{ apoio: Apoio; aviso: { para: string[]; aviso: Aviso } | null }> {
  const [l] = await db
    .select({ c: projectContributions, projeto: projects, nome: users.name })
    .from(projectContributions)
    .innerJoin(projects, eq(projects.id, projectContributions.projectId))
    .innerJoin(users, eq(users.id, usuarioId))
    .where(and(eq(projectContributions.id, apoioId), eq(projectContributions.projectId, projetoId), eq(projectContributions.supporterId, usuarioId)));
  if (!l) throw new ErroDaApi(404, "Apoio não encontrado.");
  if (l.c.status !== "PENDENTE" || l.c.paidClaimedAt) return { apoio: apoio(l.c), aviso: null };
  const [atual] = await db
    .update(projectContributions)
    .set({ paidClaimedAt: new Date() })
    .where(eq(projectContributions.id, apoioId))
    .returning();
  return {
    apoio: apoio(atual!),
    aviso: {
      para: [l.projeto.ownerId],
      aviso: {
        title: "Apoio por PIX",
        body: `${l.nome} diz que mandou R$ ${l.c.amount} para “${l.projeto.name}”. Confira no banco e confirme.`,
        url: `/projects/${projetoId}`,
        tag: `apoio-${apoioId}`,
      },
    },
  };
}

// --------------------------------------------------------------- a dona

type PessoaPublica = Omit<typeof users.$inferSelect, "passwordHash" | "location">;

const recebido = (l: { c: Linha; u: PessoaPublica | null }): ApoioRecebido => ({
  ...apoio(l.c),
  supporter: l.u ? usuarioPublico(l.u) : null,
});

/**
 * O que a dona tem para conferir e o que já decidiu. Apoio que ninguém
 * avisou que pagou some depois de dois dias: era só um QR Code gerado.
 */
export async function recebidos(db: Banco, projetoId: string, donaId: string): Promise<ApoioRecebido[]> {
  await daDona(db, projetoId, donaId);
  const linhas = await db
    .select({ c: projectContributions, u: colunasPublicas })
    .from(projectContributions)
    .leftJoin(users, eq(users.id, projectContributions.supporterId))
    .where(
      and(
        eq(projectContributions.projectId, projetoId),
        or(
          ne(projectContributions.status, "PENDENTE"),
          isNotNull(projectContributions.paidClaimedAt),
          gt(projectContributions.createdAt, sql`now() - interval '2 days'`),
        ),
      ),
    )
    .orderBy(sql`(${projectContributions.status} = 'PENDENTE' AND ${projectContributions.paidClaimedAt} IS NOT NULL) DESC`, desc(projectContributions.createdAt));
  return linhas.map(recebido);
}

/**
 * Confirmar soma ao arrecadado; recusar ("não chegou") não soma. Só se
 * decide uma vez.
 */
export async function decidir(
  db: Banco,
  projetoId: string,
  apoioId: string,
  donaId: string,
  status: "CONFIRMADO" | "RECUSADO",
): Promise<{ apoio: ApoioRecebido; aviso: { para: string[]; aviso: Aviso } | null }> {
  const projeto = await daDona(db, projetoId, donaId);
  const linha = await db.transaction(async (tx) => {
    const [c] = await tx
      .update(projectContributions)
      .set({ status, decidedAt: new Date() })
      .where(and(eq(projectContributions.id, apoioId), eq(projectContributions.projectId, projetoId), eq(projectContributions.status, "PENDENTE")))
      .returning();
    if (!c) {
      const [existe] = await tx.select().from(projectContributions).where(and(eq(projectContributions.id, apoioId), eq(projectContributions.projectId, projetoId)));
      if (!existe) throw new ErroDaApi(404, "Apoio não encontrado.");
      throw new ErroDaApi(409, "Este apoio já foi decidido.");
    }
    if (status === "CONFIRMADO") {
      await tx.update(projects).set({ fundingCurrent: sql`${projects.fundingCurrent} + ${c.amount}` }).where(eq(projects.id, projetoId));
    }
    return c;
  });
  const [u] = linha.supporterId ? await db.select(colunasPublicas).from(users).where(eq(users.id, linha.supporterId)) : [];
  return {
    apoio: recebido({ c: linha, u: u ?? null }),
    aviso:
      status === "CONFIRMADO" && linha.supporterId
        ? {
            para: [linha.supporterId],
            aviso: { title: projeto.name, body: `Seu apoio de R$ ${linha.amount} chegou. Obrigado!`, url: `/apoiar/${projetoId}`, tag: `apoio-${apoioId}` },
          }
        : null,
  };
}
