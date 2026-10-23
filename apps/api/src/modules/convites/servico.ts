import { createHash, randomBytes } from "node:crypto";

import type { Convite, ConviteCriado, ConviteRecebido, NovoConvite } from "@compoze/contracts";
import { songCollaborators, songInvites, songs, users, type Banco } from "@compoze/db";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { z } from "zod";

import type { Carteiro } from "../../lib/correio";
import { ErroDaApi } from "../../plugins/erros";
import { acessar, exigirDona, exigirEscrita } from "../songs/acesso";
import { detalhe, entrarNaCancao } from "../songs/servico";
import { emailDeConvite } from "./email";

/**
 * Convites (ADR 0010). Entrar numa canção é sempre um aceite de quem entra:
 * pela conta (a pessoa vê o convite no app) ou por link (para quem ainda não
 * tem conta). Convidar, listar e revogar são da dona.
 */

type Linha = typeof songInvites.$inferSelect;

/** Pela conta, o convite espera um mês; o link, uma semana (ele dá acesso a quem tiver). */
const VALIDADE_DIAS = { USUARIO: 30, LINK: 7 } as const;

const hashDoToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

const pendente = () =>
  and(
    isNull(songInvites.acceptedAt),
    isNull(songInvites.declinedAt),
    isNull(songInvites.revokedAt),
    gt(songInvites.expiresAt, sql`now()`),
  );

function convite(l: Linha): Convite {
  return {
    id: l.id,
    song_id: l.songId,
    kind: l.invitedUserId ? "USUARIO" : "LINK",
    role: l.role,
    invited_user_id: l.invitedUserId,
    email: l.email,
    invited_by: l.invitedBy,
    created_at: l.createdAt.toISOString(),
    expires_at: l.expiresAt.toISOString(),
  };
}

async function exigirDonaQueEscreve(db: Banco, songId: string, usuarioId: string) {
  const a = await acessar(db, songId, usuarioId);
  exigirDona(a, "convidar coautores");
  exigirEscrita(a);
  return a;
}

export async function listarDaCancao(db: Banco, songId: string, usuarioId: string): Promise<Convite[]> {
  await exigirDonaQueEscreve(db, songId, usuarioId);
  const linhas = await db
    .select()
    .from(songInvites)
    .where(and(eq(songInvites.songId, songId), pendente()))
    .orderBy(desc(songInvites.createdAt));
  return linhas.map(convite);
}

export async function convidar(
  db: Banco,
  carteiro: Carteiro,
  webUrl: string,
  songId: string,
  usuarioId: string,
  pedido: z.output<typeof NovoConvite>,
): Promise<ConviteCriado> {
  const a = await exigirDonaQueEscreve(db, songId, usuarioId);
  const validade = (tipo: keyof typeof VALIDADE_DIAS) => new Date(Date.now() + VALIDADE_DIAS[tipo] * 86_400_000);

  if ("user_id" in pedido) {
    if (pedido.user_id === usuarioId) throw new ErroDaApi(422, "Você já escreve nesta canção.");
    const [pessoa] = await db.select({ id: users.id }).from(users).where(eq(users.id, pedido.user_id));
    if (!pessoa) throw new ErroDaApi(404, "Pessoa não encontrada.");
    const [membro] = await db
      .select({ id: songCollaborators.id })
      .from(songCollaborators)
      .where(
        and(
          eq(songCollaborators.songId, songId),
          eq(songCollaborators.userId, pedido.user_id),
          isNull(songCollaborators.deletedAt),
        ),
      );
    if (membro) throw new ErroDaApi(409, "Essa pessoa já escreve nesta canção.");

    return db.transaction(async (tx) => {
      // Um convite aberto por pessoa: o anterior (mesmo vencido) dá lugar ao novo.
      await tx
        .update(songInvites)
        .set({ revokedAt: sql`now()` })
        .where(
          and(
            eq(songInvites.songId, songId),
            eq(songInvites.invitedUserId, pedido.user_id),
            isNull(songInvites.acceptedAt),
            isNull(songInvites.declinedAt),
            isNull(songInvites.revokedAt),
          ),
        );
      const [l] = await tx
        .insert(songInvites)
        .values({
          songId,
          role: pedido.role,
          invitedUserId: pedido.user_id,
          invitedBy: usuarioId,
          expiresAt: validade("USUARIO"),
        })
        .returning();
      return { ...convite(l!), token: null, emailed: false };
    });
  }

  // 32 bytes aleatórios: ninguém adivinha um link.
  const token = randomBytes(32).toString("base64url");
  const [l] = await db
    .insert(songInvites)
    .values({
      songId,
      role: pedido.role,
      tokenHash: hashDoToken(token),
      email: pedido.email ?? null,
      invitedBy: usuarioId,
      expiresAt: validade("LINK"),
    })
    .returning();

  let emailed = false;
  if (pedido.email && carteiro.habilitado) {
    const [dona] = await db.select({ name: users.name }).from(users).where(eq(users.id, usuarioId));
    await carteiro.enviar(
      emailDeConvite({
        para: pedido.email,
        quemConvida: dona?.name ?? "Alguém",
        titulo: a.cancao.title,
        link: `${webUrl}/convite/${token}`,
        validoAte: l!.expiresAt,
      }),
    );
    emailed = true;
  }
  return { ...convite(l!), token, emailed };
}

export async function revogar(db: Banco, songId: string, conviteId: string, usuarioId: string): Promise<void> {
  await exigirDonaQueEscreve(db, songId, usuarioId);
  const [r] = await db
    .update(songInvites)
    .set({ revokedAt: sql`now()` })
    .where(and(eq(songInvites.id, conviteId), eq(songInvites.songId, songId), pendente()))
    .returning({ id: songInvites.id });
  if (!r) throw new ErroDaApi(404, "Convite não encontrado.");
}

// ------------------------------------------------- quem recebe o convite

async function recebido(db: Banco, l: Linha, usuarioId: string): Promise<ConviteRecebido> {
  const [c] = await db.select({ title: songs.title }).from(songs).where(eq(songs.id, l.songId));
  const [quem] = l.invitedBy
    ? await db.select({ id: users.id, name: users.name, username: users.username }).from(users).where(eq(users.id, l.invitedBy))
    : [];
  const [membro] = await db
    .select({ id: songCollaborators.id })
    .from(songCollaborators)
    .where(
      and(eq(songCollaborators.songId, l.songId), eq(songCollaborators.userId, usuarioId), isNull(songCollaborators.deletedAt)),
    );
  return {
    id: l.id,
    kind: l.invitedUserId ? "USUARIO" : "LINK",
    song_id: l.songId,
    song_title: c?.title ?? "",
    role: l.role,
    invited_by: quem ?? null,
    created_at: l.createdAt.toISOString(),
    expires_at: l.expiresAt.toISOString(),
    already_member: Boolean(membro),
  };
}

/** Convites pela conta que a pessoa ainda não respondeu. Canção na lixeira não conta. */
export async function meus(db: Banco, usuarioId: string): Promise<ConviteRecebido[]> {
  const linhas = await db
    .select({ i: songInvites })
    .from(songInvites)
    .innerJoin(songs, eq(songs.id, songInvites.songId))
    .where(and(eq(songInvites.invitedUserId, usuarioId), pendente(), isNull(songs.deletedAt)))
    .orderBy(desc(songInvites.createdAt));
  return Promise.all(linhas.map(({ i }) => recebido(db, i, usuarioId)));
}

type Onde = ReturnType<typeof porId> | ReturnType<typeof porToken>;

/**
 * O convite pendente, se for desta pessoa. Convite que não é dela ou que não
 * existe dá 404; o que já foi usado, recusado, revogado ou venceu dá 410, com
 * a explicação.
 */
async function abrirConvite(db: Banco, onde: Onde, usuarioId: string): Promise<Linha> {
  const [l] = await db.select().from(songInvites).where(onde.filtro);
  // Pelo id, só o convite feito para a conta da pessoa. Um convite por link só
  // abre com o token: o id dele aparece para a dona, e não pode valer como link.
  const dela = onde.tipo === "id" ? l?.invitedUserId === usuarioId : !l?.invitedUserId;
  if (!l || !dela) throw new ErroDaApi(404, "Convite não encontrado.");
  if (l.acceptedAt) throw new ErroDaApi(410, "Este convite já foi usado.");
  if (l.declinedAt) throw new ErroDaApi(410, "Este convite foi recusado.");
  if (l.revokedAt) throw new ErroDaApi(410, "Este convite foi cancelado por quem convidou.");
  if (l.expiresAt.getTime() <= Date.now()) throw new ErroDaApi(410, "Este convite venceu. Peça um novo.");
  const [c] = await db.select({ deletedAt: songs.deletedAt }).from(songs).where(eq(songs.id, l.songId));
  if (!c || c.deletedAt) throw new ErroDaApi(410, "A canção deste convite foi para a lixeira.");
  return l;
}

const porId = (id: string) => ({ tipo: "id", filtro: eq(songInvites.id, id) }) as const;
const porToken = (token: string) => ({ tipo: "token", filtro: eq(songInvites.tokenHash, hashDoToken(token)) }) as const;

export async function verPorToken(db: Banco, token: string, usuarioId: string): Promise<ConviteRecebido> {
  return recebido(db, await abrirConvite(db, porToken(token), usuarioId), usuarioId);
}

async function aceitar(db: Banco, l: Linha, usuarioId: string) {
  return db.transaction(async (tx) => {
    // Só um aceite por convite, mesmo com dois cliques ao mesmo tempo.
    const [usado] = await tx
      .update(songInvites)
      .set({ acceptedAt: sql`now()`, acceptedBy: usuarioId })
      .where(and(eq(songInvites.id, l.id), isNull(songInvites.acceptedAt)))
      .returning({ id: songInvites.id });
    if (!usado) throw new ErroDaApi(410, "Este convite já foi usado.");
    await entrarNaCancao(tx, l.songId, { user_id: usuarioId, role: l.role, invited_by: l.invitedBy });
    const [c] = await tx.select().from(songs).where(eq(songs.id, l.songId));
    return detalhe(tx, c!);
  });
}

export async function aceitarPorId(db: Banco, conviteId: string, usuarioId: string) {
  return aceitar(db, await abrirConvite(db, porId(conviteId), usuarioId), usuarioId);
}

/**
 * Link: quem já escreve na canção não gasta o convite (ele pode ser para
 * outra pessoa). Devolve a canção do mesmo jeito.
 */
export async function aceitarPorToken(db: Banco, token: string, usuarioId: string) {
  const l = await abrirConvite(db, porToken(token), usuarioId);
  const v = await recebido(db, l, usuarioId);
  if (v.already_member) {
    const [c] = await db.select().from(songs).where(eq(songs.id, l.songId));
    return detalhe(db, c!);
  }
  return aceitar(db, l, usuarioId);
}

export async function recusar(db: Banco, conviteId: string, usuarioId: string): Promise<void> {
  const l = await abrirConvite(db, porId(conviteId), usuarioId);
  await db.update(songInvites).set({ declinedAt: sql`now()` }).where(eq(songInvites.id, l.id));
}
