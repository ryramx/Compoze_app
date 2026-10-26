import type { Cadastro, ParDeTokens } from "@compoze/contracts";
import { refreshTokens, users, type Banco } from "@compoze/db";
import { and, eq, isNull, sql } from "drizzle-orm";

import type { Config } from "../../config";
import { ErroDaApi } from "../../plugins/erros";
import { conferir, gerarHash } from "./senha";
import { emitirAcesso, hashDoRefresh, novoRefresh } from "./tokens";

const JANELA_DE_CORRIDA_MS = 10_000;

type Ctx = { db: Banco; config: Config };

async function emitirPar({ db, config }: Ctx, usuarioId: string, familia?: string): Promise<ParDeTokens> {
  const refresh = novoRefresh();
  await db.insert(refreshTokens).values({
    userId: usuarioId,
    familyId: familia ?? crypto.randomUUID(),
    tokenHash: refresh.hash,
    expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_DIAS * 86_400_000),
  });
  return {
    access_token: await emitirAcesso(usuarioId, config.JWT_SECRET, config.ACCESS_TOKEN_MINUTOS),
    refresh_token: refresh.token,
    token_type: "bearer",
  };
}

export async function cadastrar(ctx: Ctx, dados: Cadastro): Promise<ParDeTokens> {
  const repetido = await ctx.db
    .select({ email: users.email, username: users.username })
    .from(users)
    .where(sql`${users.email} = ${dados.email} OR ${users.username} = ${dados.username}`);
  if (repetido.some((u) => u.email.toLowerCase() === dados.email.toLowerCase())) {
    throw new ErroDaApi(409, "Já existe uma conta com este e-mail.");
  }
  if (repetido.length > 0) throw new ErroDaApi(409, "Este nome de usuário já está em uso.");

  const [u] = await ctx.db
    .insert(users)
    .values({
      name: dados.name,
      username: dados.username,
      email: dados.email,
      passwordHash: await gerarHash(dados.password),
    })
    .returning({ id: users.id });
  return emitirPar(ctx, u!.id);
}

export async function entrar(ctx: Ctx, email: string, senha: string): Promise<ParDeTokens> {
  const [u] = await ctx.db
    .select({ id: users.id, hash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email));
  if (!(await conferir(u?.hash ?? null, senha)) || !u) throw new ErroDaApi(401, "E-mail ou senha incorretos.");
  return emitirPar(ctx, u.id);
}

/**
 * Senha nova para quem já está dentro (ADR 0019). Não pede a atual: serve
 * justamente a quem esqueceu e ainda tem a sessão aberta num aparelho. Em
 * troca, toda sessão aberta cai (as outras pontas precisam entrar com a senha
 * nova) e este aparelho recebe um par novo.
 */
export async function trocarSenha(ctx: Ctx, usuarioId: string, nova: string): Promise<ParDeTokens> {
  const hash = await gerarHash(nova);
  await ctx.db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash: hash }).where(eq(users.id, usuarioId));
    await tx
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(refreshTokens.userId, usuarioId), isNull(refreshTokens.revokedAt)));
  });
  return emitirPar(ctx, usuarioId);
}

/**
 * Troca um refresh token por um par novo. O token apresentado é gasto (uso
 * único). Se ele já tinha sido gasto, alguém tem uma cópia: a família inteira
 * é revogada e as duas pontas precisam entrar de novo.
 */
export async function renovar(ctx: Ctx, token: string): Promise<ParDeTokens> {
  const expirada = new ErroDaApi(401, "Sessão expirada. Entre de novo.");
  const hash = hashDoRefresh(token);

  const [gasto] = await ctx.db
    .update(refreshTokens)
    .set({ usedAt: sql`now()` })
    .where(
      and(
        eq(refreshTokens.tokenHash, hash),
        isNull(refreshTokens.usedAt),
        isNull(refreshTokens.revokedAt),
        sql`${refreshTokens.expiresAt} > now()`,
      ),
    )
    .returning();
  if (gasto) return emitirPar(ctx, gasto.userId, gasto.familyId);

  const [conhecido] = await ctx.db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hash));
  // Dois envios quase juntos (duas abas abrindo o app) são corrida, não roubo:
  // o segundo só perde. Reuso depois da janela derruba a família.
  const corrida = conhecido?.usedAt && Date.now() - conhecido.usedAt.getTime() < JANELA_DE_CORRIDA_MS;
  if (conhecido?.usedAt && !corrida) {
    await ctx.db
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(refreshTokens.familyId, conhecido.familyId), isNull(refreshTokens.revokedAt)));
  }
  throw expirada;
}
