import type { PapelDeColaborador } from "@compoze/contracts";
import { songCollaborators, songs, type Banco } from "@compoze/db";
import { and, eq, isNull } from "drizzle-orm";
import type { z } from "zod";

import { ErroDaApi } from "../../plugins/erros";

type Papel = z.infer<typeof PapelDeColaborador>;
export type Acesso = { cancao: typeof songs.$inferSelect; papel: Papel };

export const naoEncontrada = () => new ErroDaApi(404, "Canção não encontrada.");

/**
 * A canção, se a pessoa for dona ou coautora. Quem não tem acesso recebe 404,
 * e não 403, para não revelar que a canção existe.
 */
export async function acessar(db: Banco, songId: string, usuarioId: string): Promise<Acesso> {
  const [linha] = await db
    .select({ cancao: songs, papel: songCollaborators.role })
    .from(songs)
    .innerJoin(
      songCollaborators,
      and(
        eq(songCollaborators.songId, songs.id),
        eq(songCollaborators.userId, usuarioId),
        isNull(songCollaborators.deletedAt),
      ),
    )
    .where(eq(songs.id, songId));
  if (!linha) throw naoEncontrada();
  return linha;
}

/** Escrever: qualquer papel menos VIEWER, e a canção fora da lixeira. */
export function exigirEscrita(a: Acesso): void {
  if (a.papel === "VIEWER") throw new ErroDaApi(403, "Você pode ver esta canção, mas não editar.");
  if (a.cancao.deletedAt) throw new ErroDaApi(409, "A canção está na lixeira. Restaure antes de editar.");
}

/** Lixeira, exclusão, coautores e divisão são decisões da dona. */
export function exigirDona(a: Acesso, acao: string): void {
  if (a.papel !== "OWNER") throw new ErroDaApi(403, `Só a dona da canção pode ${acao}.`);
}
