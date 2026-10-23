import { api } from "@/lib/api";
import { musicaDaApi } from "@/services/api/adapters";
import type {
  ApiCollaboratorRole,
  ApiInviteCreated,
  ApiNewInvite,
  ApiReceivedInvite,
  ApiSongDetail,
  ApiSongInvites,
} from "@/services/api/dto";
import type { Song } from "@/types";

/**
 * Convites (ADR 0010). Pela conta, a pessoa aceita ou recusa no app; por
 * link, quem abrir o link e entrar aceita. Tudo precisa de rede: um convite
 * só vale depois que o servidor sabe dele.
 */

type Papel = Exclude<ApiCollaboratorRole, "OWNER">;

export const daCancao = (songId: string) => api.get<ApiSongInvites>(`/songs/${songId}/invites`);

export const convidarConta = (songId: string, userId: string, role: Papel = "COMPOSER") =>
  api.post<ApiInviteCreated>(`/songs/${songId}/invites`, { user_id: userId, role } satisfies ApiNewInvite);

export const criarLink = (songId: string, opcoes: { role?: Papel; email?: string } = {}) =>
  api.post<ApiInviteCreated>(`/songs/${songId}/invites`, {
    link: true,
    role: opcoes.role ?? "COMPOSER",
    ...(opcoes.email ? { email: opcoes.email } : {}),
  } satisfies ApiNewInvite);

export const cancelar = (songId: string, inviteId: string) => api.delete(`/songs/${songId}/invites/${inviteId}`);

/** O endereço que a pessoa abre: a página do convite neste mesmo app. */
export const enderecoDoLink = (token: string) => `${window.location.origin}/convite/${token}`;

export const recebidos = () => api.get<ApiReceivedInvite[]>("/invites");

export async function aceitar(inviteId: string): Promise<Song> {
  return musicaDaApi(await api.post<ApiSongDetail>(`/invites/${inviteId}/accept`, {}));
}

export const recusar = (inviteId: string) => api.post(`/invites/${inviteId}/decline`, {});

export const verLink = (token: string) => api.get<ApiReceivedInvite>(`/invites/link/${token}`);

export async function aceitarLink(token: string): Promise<Song> {
  return musicaDaApi(await api.post<ApiSongDetail>(`/invites/link/${token}/accept`, {}));
}
