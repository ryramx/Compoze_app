// Funções puras para a entidade Folder — ver comentário em songService.ts.
import type { Folder } from "@/types";

const uid = () => Math.random().toString(36).slice(2, 10);

export function getChildren(folders: Folder[], parentId?: string): Folder[] {
  return folders.filter((f) => f.parentId === parentId);
}

export function create(
  folders: Folder[],
  name: string,
  ownerId: string,
  parentId?: string,
): { folders: Folder[]; newId: string } {
  const id = "f_" + uid();
  return { folders: [...folders, { id, name, ownerId, parentId }], newId: id };
}
