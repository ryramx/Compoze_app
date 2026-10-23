import type { AtualizarCancao, DetalheDaCancao, ResumoDaCancao } from "@compoze/contracts";
import { folders, songBlocks, songCollaborators, songs, users, type Banco } from "@compoze/db";
import { editarTexto, inserirBloco, lerBlocos, mudarBloco, removerBloco as removerDoDocumento } from "@compoze/documento";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql, type SQL } from "drizzle-orm";

import { bloco, colaborador, resumoDaCancao } from "../../lib/mapear";
import { uuidv7 } from "../../lib/uuidv7";
import { ErroDaApi } from "../../plugins/erros";
import { editarDocumento } from "../colab/editar";
import { fecharEditores, type Colaboracao } from "../colab/servidor";
import { acessar, exigirDona, exigirEscrita, type Acesso } from "./acesso";

/** RN08: dias que uma canção fica na lixeira antes do expurgo. */
export const RETENCAO_DIAS = 30;

type Tx = Parameters<Parameters<Banco["transaction"]>[0]>[0];

export async function detalhe(db: Banco | Tx, cancao: typeof songs.$inferSelect): Promise<DetalheDaCancao> {
  const [blocos, colaboradores] = await Promise.all([
    db.select().from(songBlocks).where(eq(songBlocks.songId, cancao.id)).orderBy(asc(songBlocks.position)),
    db
      .select()
      .from(songCollaborators)
      .where(and(eq(songCollaborators.songId, cancao.id), isNull(songCollaborators.deletedAt)))
      .orderBy(asc(songCollaborators.createdAt)),
  ]);
  return {
    ...resumoDaCancao(cancao),
    description: cancao.description,
    blocks: blocos.map(bloco),
    collaborators: colaboradores.map(colaborador),
  };
}

async function recarregar(db: Banco | Tx, id: string) {
  const [c] = await db.select().from(songs).where(eq(songs.id, id));
  return detalhe(db, c!);
}

/** Uma pasta só aceita canções da própria dona da pasta. */
async function exigirPastaDa(db: Banco | Tx, folderId: string, donaId: string) {
  const [f] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.ownerId, donaId), isNull(folders.deletedAt)));
  if (!f) throw new ErroDaApi(422, "Pasta não encontrada.");
}

const escaparLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function listar(
  db: Banco,
  usuarioId: string,
  filtro: { q?: string; status?: ResumoDaCancao["status"]; folder_id?: string; expand?: string[] },
): Promise<ResumoDaCancao[] | DetalheDaCancao[]> {
  const condicoes: SQL[] = [isNull(songs.deletedAt)];
  if (filtro.status) condicoes.push(eq(songs.status, filtro.status));
  if (filtro.folder_id) condicoes.push(eq(songs.folderId, filtro.folder_id));
  if (filtro.q) {
    // Sem acento e sem caixa, em título, tags e texto dos blocos.
    const termo = `%${escaparLike(filtro.q)}%`;
    condicoes.push(sql`(
      compoze_normalizar(${songs.title}) LIKE compoze_normalizar(${termo})
      OR compoze_normalizar(array_to_string(${songs.tags}, ' ')) LIKE compoze_normalizar(${termo})
      OR EXISTS (
        SELECT 1 FROM ${songBlocks}
        WHERE ${songBlocks.songId} = ${songs.id}
          AND compoze_normalizar(${songBlocks.content}) LIKE compoze_normalizar(${termo})
      )
    )`);
  }

  const linhas = await db
    .select({ cancao: songs })
    .from(songs)
    .innerJoin(
      songCollaborators,
      and(
        eq(songCollaborators.songId, songs.id),
        eq(songCollaborators.userId, usuarioId),
        isNull(songCollaborators.deletedAt),
      ),
    )
    .where(and(...condicoes))
    .orderBy(desc(songs.updatedAt));
  if (!filtro.expand?.length) return linhas.map((l) => resumoDaCancao(l.cancao));
  return expandir(db, linhas.map((l) => l.cancao), new Set(filtro.expand));
}

/** Canções completas em três consultas, qualquer que seja o tamanho da lista. */
async function expandir(db: Banco, lista: (typeof songs.$inferSelect)[], campos: Set<string>): Promise<DetalheDaCancao[]> {
  const ids = lista.map((c) => c.id);
  if (ids.length === 0) return [];
  const [blocos, colaboradores] = await Promise.all([
    campos.has("blocks")
      ? db.select().from(songBlocks).where(inArray(songBlocks.songId, ids)).orderBy(asc(songBlocks.position))
      : [],
    campos.has("collaborators")
      ? db
          .select()
          .from(songCollaborators)
          .where(and(inArray(songCollaborators.songId, ids), isNull(songCollaborators.deletedAt)))
          .orderBy(asc(songCollaborators.createdAt))
      : [],
  ]);
  const agrupar = <T extends { songId: string }>(xs: T[]) => {
    const m = new Map<string, T[]>();
    for (const x of xs) m.set(x.songId, [...(m.get(x.songId) ?? []), x]);
    return m;
  };
  const porBloco = agrupar(blocos);
  const porColab = agrupar(colaboradores);
  return lista.map((c) => ({
    ...resumoDaCancao(c),
    description: c.description,
    blocks: (porBloco.get(c.id) ?? []).map(bloco),
    collaborators: (porColab.get(c.id) ?? []).map(colaborador),
  }));
}

export async function criar(
  db: Banco,
  usuarioId: string,
  dados: { id?: string; title: string; folder_id?: string | null; folha_pautada?: boolean },
): Promise<DetalheDaCancao> {
  if (dados.folder_id) await exigirPastaDa(db, dados.folder_id, usuarioId);
  return db.transaction(async (tx) => {
    const [c] = await tx
      .insert(songs)
      .values({
        ...(dados.id ? { id: dados.id } : {}),
        ownerId: usuarioId,
        title: dados.title,
        folderId: dados.folder_id ?? null,
        timeSignature: "4/4",
      })
      .returning();
    // A dona entra como coautora a 100%: a divisão começa resolvida.
    await tx.insert(songCollaborators).values({ songId: c!.id, userId: usuarioId, role: "OWNER", contributionPercent: 100 });
    // Folha pautada: um verso pronto para escrever, como no protótipo. O app
    // pede sem, porque monta a folha no documento Yjs (ADR 0008).
    if (dados.folha_pautada !== false) {
      await tx.insert(songBlocks).values([
        { songId: c!.id, type: "SECTION", label: "Verso 1", content: "", position: 0, authorId: usuarioId },
        { songId: c!.id, type: "LYRIC", label: null, content: "", position: 1, authorId: usuarioId },
      ]);
    }
    return detalhe(tx, c!);
  });
}

export async function obter(db: Banco, songId: string, usuarioId: string) {
  const { cancao } = await acessar(db, songId, usuarioId);
  return detalhe(db, cancao);
}

export async function atualizar(db: Banco, songId: string, usuarioId: string, p: AtualizarCancao) {
  const a = await acessar(db, songId, usuarioId);
  exigirEscrita(a);
  if (p.folder_id !== undefined) {
    // A pasta é da dona; mudar a canção de lugar é decisão dela.
    exigirDona(a, "mudar a canção de pasta");
    if (p.folder_id) await exigirPastaDa(db, p.folder_id, a.cancao.ownerId);
  }
  const mudancas: Partial<typeof songs.$inferInsert> = {};
  if (p.title !== undefined) mudancas.title = p.title;
  if (p.status !== undefined) mudancas.status = p.status;
  if (p.folder_id !== undefined) mudancas.folderId = p.folder_id;
  if (p.musical_key !== undefined) mudancas.musicalKey = p.musical_key;
  if (p.bpm !== undefined) mudancas.bpm = p.bpm;
  if (p.time_signature !== undefined) mudancas.timeSignature = p.time_signature;
  if (p.tags !== undefined) mudancas.tags = [...new Set(p.tags)];
  if (p.visibility !== undefined) mudancas.visibility = p.visibility;
  if (p.description !== undefined) mudancas.description = p.description;
  if (Object.keys(mudancas).length === 0) return detalhe(db, a.cancao);

  const [c] = await db.update(songs).set(mudancas).where(eq(songs.id, songId)).returning();
  return detalhe(db, c!);
}

// ------------------------------------------------------------ lixeira

/** RN07: vai para a lixeira sem perder pasta nem projetos. */
export async function mandarParaLixeira(db: Banco, colab: Colaboracao, songId: string, usuarioId: string) {
  const a = await acessar(db, songId, usuarioId);
  exigirDona(a, "mandar a canção para a lixeira");
  if (!a.cancao.deletedAt) await db.update(songs).set({ deletedAt: sql`now()` }).where(eq(songs.id, songId));
  // Quem estava com a canção aberta reconecta já sem poder escrever.
  fecharEditores(colab, songId);
}

export async function lixeira(db: Banco, usuarioId: string) {
  const linhas = await db
    .select({ cancao: songs, dias: sql<number>`floor(extract(epoch from now() - ${songs.deletedAt}) / 86400)::int` })
    .from(songs)
    .where(and(eq(songs.ownerId, usuarioId), isNotNull(songs.deletedAt)))
    .orderBy(desc(songs.deletedAt));
  return linhas.map((l) => ({ ...resumoDaCancao(l.cancao), days_remaining: Math.max(0, RETENCAO_DIAS - l.dias) }));
}

export async function restaurar(db: Banco, colab: Colaboracao, songId: string, usuarioId: string) {
  const a = await acessar(db, songId, usuarioId);
  exigirDona(a, "restaurar a canção");
  if (!a.cancao.deletedAt) return detalhe(db, a.cancao);
  const [c] = await db.update(songs).set({ deletedAt: null }).where(eq(songs.id, songId)).returning();
  fecharEditores(colab, songId);
  return detalhe(db, c!);
}

export async function apagarDeVez(db: Banco, colab: Colaboracao, songId: string, usuarioId: string) {
  const a = await acessar(db, songId, usuarioId);
  exigirDona(a, "apagar a canção de vez");
  await db.delete(songs).where(eq(songs.id, songId));
  fecharEditores(colab, songId);
}

// ------------------------------------------------------------- blocos
//
// O conteúdo da canção mora no documento Yjs (ADR 0007). As rotas REST de
// blocos editam esse documento, como mais um editor; a gravação refaz
// `song_blocks`, que é de onde a resposta é lida.

type TipoDoBloco = DetalheDaCancao["blocks"][number]["type"];

const blocoNaoEncontrado = () => new ErroDaApi(404, "Bloco não encontrado.");

export async function adicionarBloco(
  db: Banco,
  colab: Colaboracao,
  songId: string,
  usuarioId: string,
  b: { id?: string; type: TipoDoBloco; content: string; label?: string | null; position?: number },
) {
  exigirEscrita(await acessar(db, songId, usuarioId));
  const id = b.id ?? uuidv7();
  await editarDocumento(colab, songId, usuarioId, (doc) => {
    if (lerBlocos(doc).some((x) => x.id === id)) throw new ErroDaApi(409, "Já existe um bloco com esse id.");
    inserirBloco(doc, { id, type: b.type, label: b.label ?? null, content: b.content, author_id: usuarioId }, b.position);
  });
  return recarregar(db, songId);
}

export async function atualizarBloco(
  db: Banco,
  colab: Colaboracao,
  songId: string,
  blocoId: string,
  usuarioId: string,
  p: { content?: string; label?: string | null; type?: TipoDoBloco },
) {
  exigirEscrita(await acessar(db, songId, usuarioId));
  await editarDocumento(colab, songId, usuarioId, (doc) => {
    if (!lerBlocos(doc).some((x) => x.id === blocoId)) throw blocoNaoEncontrado();
    if (p.content !== undefined) editarTexto(doc, blocoId, p.content);
    mudarBloco(doc, blocoId, { label: p.label, type: p.type });
  });
  const [linha] = await db
    .select()
    .from(songBlocks)
    .where(and(eq(songBlocks.id, blocoId), eq(songBlocks.songId, songId)));
  if (!linha) throw blocoNaoEncontrado();
  return bloco(linha);
}

export async function removerBloco(db: Banco, colab: Colaboracao, songId: string, blocoId: string, usuarioId: string) {
  exigirEscrita(await acessar(db, songId, usuarioId));
  await editarDocumento(colab, songId, usuarioId, (doc) => {
    if (!removerDoDocumento(doc, blocoId)) throw blocoNaoEncontrado();
  });
}

// ---------------------------------------------------------- coautoria

export async function convidar(db: Banco, songId: string, usuarioId: string, alvo: { user_id: string; role: Acesso["papel"] }) {
  const a = await acessar(db, songId, usuarioId);
  exigirDona(a, "convidar coautores");
  exigirEscrita(a);
  const [pessoa] = await db.select({ id: users.id }).from(users).where(eq(users.id, alvo.user_id));
  if (!pessoa) throw new ErroDaApi(404, "Pessoa não encontrada.");

  return db.transaction(async (tx) => {
    const [existente] = await tx
      .select()
      .from(songCollaborators)
      .where(and(eq(songCollaborators.songId, songId), eq(songCollaborators.userId, alvo.user_id)));
    if (existente && !existente.deletedAt) return detalhe(tx, a.cancao);

    if (existente) {
      // Removida antes e convidada de novo: a mesma linha volta (lápide limpa).
      await tx
        .update(songCollaborators)
        .set({ deletedAt: null, role: alvo.role, contributionPercent: 0, invitedBy: usuarioId })
        .where(eq(songCollaborators.id, existente.id));
    } else {
      await tx
        .insert(songCollaborators)
        .values({ songId, userId: alvo.user_id, role: alvo.role, contributionPercent: 0, invitedBy: usuarioId });
    }
    // Entrou gente nova: a divisão precisa ser fechada de novo (RN05).
    await tx.update(songs).set({ contributionsConfirmed: false }).where(eq(songs.id, songId));
    return recarregar(tx, songId);
  });
}

export async function removerCoautor(db: Banco, songId: string, usuarioId: string, alvoId: string) {
  const a = await acessar(db, songId, usuarioId);
  exigirDona(a, "remover coautores");
  if (alvoId === a.cancao.ownerId) throw new ErroDaApi(422, "A dona não pode ser removida da própria canção.");
  await db.transaction(async (tx) => {
    const [removido] = await tx
      .update(songCollaborators)
      .set({ deletedAt: sql`now()` })
      .where(
        and(eq(songCollaborators.songId, songId), eq(songCollaborators.userId, alvoId), isNull(songCollaborators.deletedAt)),
      )
      .returning({ id: songCollaborators.id });
    if (!removido) throw new ErroDaApi(404, "Essa pessoa não é coautora da canção.");
    await tx.update(songs).set({ contributionsConfirmed: false }).where(eq(songs.id, songId));
  });
}

const porcento = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")}%`;

/**
 * RN05. Sem `confirm`, qualquer divisão parcial vale e a canção fica com a
 * divisão em aberto. Com `confirm`, a soma de todos os coautores (os enviados
 * com o valor novo, os demais com o atual) precisa ser exatamente 100.
 */
export async function dividir(
  db: Banco,
  songId: string,
  usuarioId: string,
  d: { contributions: { user_id: string; percentage: number }[]; confirm: boolean },
) {
  const a = await acessar(db, songId, usuarioId);
  exigirDona(a, "acertar a divisão de coautoria");
  exigirEscrita(a);

  return db.transaction(async (tx) => {
    const atuais = await tx
      .select()
      .from(songCollaborators)
      .where(and(eq(songCollaborators.songId, songId), isNull(songCollaborators.deletedAt)))
      .for("update");
    const porPessoa = new Map(atuais.map((c) => [c.userId, c]));

    for (const c of d.contributions) {
      if (!porPessoa.has(c.user_id)) throw new ErroDaApi(422, "A divisão inclui alguém que não é coautor da canção.");
    }
    const novos = new Map(d.contributions.map((c) => [c.user_id, Math.round(c.percentage * 100) / 100]));

    if (d.confirm) {
      const centesimos = atuais.reduce(
        (soma, c) => soma + Math.round((novos.get(c.userId) ?? c.contributionPercent ?? 0) * 100),
        0,
      );
      if (centesimos !== 10_000) {
        throw new ErroDaApi(422, `A divisão soma ${porcento(centesimos / 100)}. Precisa fechar em 100%.`);
      }
    }

    for (const [userId, pct] of novos) {
      const c = porPessoa.get(userId)!;
      if (c.contributionPercent !== pct) {
        await tx.update(songCollaborators).set({ contributionPercent: pct }).where(eq(songCollaborators.id, c.id));
      }
    }
    await tx.update(songs).set({ contributionsConfirmed: d.confirm }).where(eq(songs.id, songId));
    return recarregar(tx, songId);
  });
}
