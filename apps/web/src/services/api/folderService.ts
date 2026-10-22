import { api } from "@/lib/api";
import { pastaDaApi } from "@/services/api/adapters";
import type { ApiFolder } from "@/services/api/dto";
import type { Folder } from "@/types";

export async function list(): Promise<Folder[]> {
  // Sem parent_id: a API devolve a árvore inteira em lista plana, e a tela monta
  // a hierarquia pelo parentId. Evita uma requisição por nível de navegação.
  const dados = await api.get<ApiFolder[]>("/folders");
  return dados.map(pastaDaApi);
}

export async function create(name: string, parentId?: string): Promise<Folder> {
  return pastaDaApi(
    await api.post<ApiFolder>("/folders", {
      name,
      ...(parentId ? { parent_id: parentId } : {}),
    }),
  );
}

export async function rename(id: string, name: string): Promise<Folder> {
  return pastaDaApi(await api.patch<ApiFolder>(`/folders/${id}`, { name }));
}

export async function move(id: string, parentId: string | null): Promise<Folder> {
  return pastaDaApi(await api.patch<ApiFolder>(`/folders/${id}`, { parent_id: parentId }));
}

export async function remove(id: string): Promise<void> {
  // O backend sobe as subpastas um nível e desvincula as músicas — nada do que
  // estava dentro é destruído.
  await api.delete(`/folders/${id}`);
}
