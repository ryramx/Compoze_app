export type SongStatus = "ideia" | "escrita" | "revisao" | "finalizada" | "registrada" | "gravada";

export interface Contribution {
  userId: string;
  percentage: number;
}

export interface SongBlock {
  id: string;
  type: "section" | "chord-line" | "lyric-line" | "note";
  label?: string; // ex: Verso 1, Refrão
  text: string;
  /** Quem escreveu; `null` quando a conta de quem escreveu foi apagada. */
  authorId: string | null;
}

export interface Song {
  id: string;
  title: string;
  status: SongStatus;
  creatorId: string;
  collaborators: Contribution[];
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  // Pastas são organização opcional: nem toda música precisa pertencer a uma
  // pasta (ex.: músicas soltas de um projeto). Ausência de folderId é um
  // estado válido, não um dado incompleto — não inventar uma pasta "sem
  // pasta" nem forçar atribuição.
  folderId?: string;
  blocks: SongBlock[];
  key?: string;
  bpm?: number;
  timeSignature?: string;
  tags?: string[];
  hidden?: boolean;
  /** Divisão de coautoria fechada (RN05). Editar um percentual reabre. */
  contributionsConfirmed?: boolean;
  // Soft delete (RN07/RN08): presença de deletedAt = música na Lixeira.
  // folderId/projectId são preservados intactos enquanto na lixeira, para
  // que "Restaurar" volte exatamente à localização original sem campos extras.
  deletedAt?: string;
}
