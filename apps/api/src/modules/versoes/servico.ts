import { createHash } from "node:crypto";

import {
  TIPOS_DE_BLOCO,
  textoDaVersao,
  type MotivoDaVersao,
  type ResumoDaVersao,
  type RetratoDaCancao,
  type Versao,
} from "@compoze/contracts";
import { songCollaborators, songs, songVersions, users, type Banco } from "@compoze/db";
import { lerBlocos } from "@compoze/documento";
import { and, asc, desc, eq } from "drizzle-orm";

import { uuidv7 } from "../../lib/uuidv7";
import { ErroDaApi } from "../../plugins/erros";
import { editarDocumento } from "../colab/editar";
import type { Colaboracao } from "../colab/servidor";
import { acessar, exigirDona, exigirEscrita } from "../songs/acesso";

/**
 * Versões da canção (ADR 0009). Cada versão é um retrato imutável: o banco
 * recusa UPDATE (gatilho `compoze_imutavel`) e o hash de cada uma inclui o da
 * anterior, então mexer numa versão antiga quebra a corrente dali em diante.
 */

type Linha = typeof songVersions.$inferSelect;

const TIPOS = new Set<string>(TIPOS_DE_BLOCO);

function resumo(l: Linha): ResumoDaVersao {
  return {
    id: l.id,
    song_id: l.songId,
    number: l.number,
    reason: l.reason,
    label: l.label,
    title: (l.snapshot as RetratoDaCancao).title,
    sha256: l.sha256,
    previous_sha256: l.previousSha256,
    created_by: l.createdBy,
    created_at: l.createdAt.toISOString(),
  };
}

const completa = (l: Linha): Versao => ({ ...resumo(l), snapshot: l.snapshot as RetratoDaCancao });

export async function listar(db: Banco, songId: string, usuarioId: string): Promise<ResumoDaVersao[]> {
  await acessar(db, songId, usuarioId);
  const linhas = await db
    .select()
    .from(songVersions)
    .where(eq(songVersions.songId, songId))
    .orderBy(desc(songVersions.number));
  return linhas.map(resumo);
}

export async function obter(db: Banco, songId: string, numero: number, usuarioId: string): Promise<Versao> {
  await acessar(db, songId, usuarioId);
  const [l] = await db
    .select()
    .from(songVersions)
    .where(and(eq(songVersions.songId, songId), eq(songVersions.number, numero)));
  if (!l) throw new ErroDaApi(404, "Versão não encontrada.");
  return completa(l);
}

/**
 * Grava uma versão com o estado de agora. O texto vem do documento Yjs em
 * memória, não de `song_blocks`: a projeção pode estar até 10 s atrás do que
 * as pessoas estão escrevendo.
 *
 * `mudarStatus` aplica uma mudança de estágio na mesma transação da versão
 * (registrar é as duas coisas, ou nenhuma).
 */
export async function guardar(
  db: Banco,
  colab: Colaboracao,
  songId: string,
  usuarioId: string,
  motivo: MotivoDaVersao,
  opcoes: { label?: string | null; mudarStatus?: typeof songs.$inferSelect.status } = {},
): Promise<Versao> {
  const blocos = await editarDocumento(colab, songId, usuarioId, (doc) => lerBlocos(doc));

  return db.transaction(async (tx) => {
    // Trava a canção: duas versões ao mesmo tempo não disputam o mesmo número.
    const [cancao] = await tx.select().from(songs).where(eq(songs.id, songId)).for("update");
    if (!cancao) throw new ErroDaApi(404, "Canção não encontrada.");
    const status = opcoes.mudarStatus ?? cancao.status;
    if (opcoes.mudarStatus && opcoes.mudarStatus !== cancao.status) {
      await tx.update(songs).set({ status }).where(eq(songs.id, songId));
    }

    const pessoas = await tx
      .select({ c: songCollaborators, u: { id: users.id, name: users.name, username: users.username } })
      .from(songCollaborators)
      .innerJoin(users, eq(users.id, songCollaborators.userId))
      .where(eq(songCollaborators.songId, songId))
      .orderBy(asc(songCollaborators.createdAt));
    // Autora de bloco só vale se escreveu na canção (mesmo que tenha saído).
    const autoras = new Set(pessoas.map((p) => p.u.id));

    const snapshot: RetratoDaCancao = {
      formato: 1,
      song_id: songId,
      title: cancao.title,
      status,
      musical_key: cancao.musicalKey,
      bpm: cancao.bpm,
      time_signature: cancao.timeSignature,
      tags: cancao.tags,
      description: cancao.description,
      blocks: blocos
        .filter((b) => TIPOS.has(b.type))
        .map((b) => ({
          id: b.id,
          type: b.type as RetratoDaCancao["blocks"][number]["type"],
          label: b.label,
          content: b.content,
          author_id: b.author_id && autoras.has(b.author_id) ? b.author_id : null,
        })),
      collaborators: pessoas
        .filter((p) => !p.c.deletedAt)
        .map((p) => ({
          user_id: p.u.id,
          name: p.u.name,
          username: p.u.username,
          role: p.c.role,
          contribution_percent: p.c.contributionPercent,
        })),
      contributions_confirmed: cancao.contributionsConfirmed,
    };

    const [anterior] = await tx
      .select({ number: songVersions.number, sha256: songVersions.sha256 })
      .from(songVersions)
      .where(eq(songVersions.songId, songId))
      .orderBy(desc(songVersions.number))
      .limit(1);

    // A hora entra no hash, então é fixada aqui (em milissegundos, como o
    // ISO 8601 do contrato) e gravada exatamente assim.
    const criadaEm = new Date();
    const semHash = {
      song_id: songId,
      number: (anterior?.number ?? 0) + 1,
      reason: motivo,
      label: opcoes.label ?? null,
      created_by: usuarioId,
      created_at: criadaEm.toISOString(),
      previous_sha256: anterior?.sha256 ?? null,
      snapshot,
    };
    const sha256 = createHash("sha256").update(textoDaVersao(semHash), "utf8").digest("hex");

    const [l] = await tx
      .insert(songVersions)
      .values({
        id: uuidv7(),
        songId,
        number: semHash.number,
        snapshot,
        sha256,
        previousSha256: semHash.previous_sha256,
        reason: motivo,
        label: semHash.label,
        createdBy: usuarioId,
        createdAt: criadaEm,
      })
      .returning();
    return completa(l!);
  });
}

/** "Guardar versão": qualquer pessoa que escreve na canção. */
export async function guardarManual(
  db: Banco,
  colab: Colaboracao,
  songId: string,
  usuarioId: string,
  label: string | null | undefined,
) {
  exigirEscrita(await acessar(db, songId, usuarioId));
  return guardar(db, colab, songId, usuarioId, "MANUAL", { label });
}

/**
 * Registrar a obra: estágio "Registrada" e uma versão de registro, juntos. Só
 * a dona, e só com a divisão de coautoria fechada (RN05): o registro afirma
 * quem é dono de quanto.
 */
export async function registrar(db: Banco, colab: Colaboracao, songId: string, usuarioId: string) {
  const a = await acessar(db, songId, usuarioId);
  exigirDona(a, "registrar a obra");
  exigirEscrita(a);
  if (!a.cancao.contributionsConfirmed) {
    throw new ErroDaApi(409, "Feche a divisão de coautoria antes de registrar.");
  }
  return guardar(db, colab, songId, usuarioId, "REGISTRO", { mudarStatus: "REGISTRADA" });
}
