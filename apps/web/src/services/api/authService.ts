import { api, setAccessToken } from "@/lib/api";
import { usuarioDaApi } from "@/services/api/adapters";
import type { ApiTokenPair, ApiUserMe } from "@/services/api/dto";
import type { User } from "@/types";

const REFRESH_KEY = "compoze.refreshToken";

function guardarRefresh(token: string | null): void {
  try {
    if (token === null) localStorage.removeItem(REFRESH_KEY);
    else localStorage.setItem(REFRESH_KEY, token);
  } catch {
    // Sem storage a sessão não sobrevive ao reload, mas o app segue.
  }
}

export function lerRefresh(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

function guardarPar(par: ApiTokenPair): void {
  setAccessToken(par.access_token);
  guardarRefresh(par.refresh_token);
}

export interface DadosCadastro {
  name: string;
  username: string;
  email: string;
  password: string;
}

export async function register(dados: DadosCadastro): Promise<User> {
  guardarPar(await api.post<ApiTokenPair>("/auth/register", dados));
  return me();
}

export async function login(email: string, password: string): Promise<User> {
  guardarPar(await api.post<ApiTokenPair>("/auth/login", { email, password }));
  return me();
}

export async function me(): Promise<User> {
  return usuarioDaApi(await api.get<ApiUserMe>("/users/me"));
}

export function logout(): void {
  setAccessToken(null);
  guardarRefresh(null);
}

/**
 * Tenta restaurar a sessão a partir do refresh token guardado.
 *
 * Usado na abertura do app: o access token dura 30 minutos, então quem volta
 * depois disso tem um token expirado mas um refresh válido — e não deveria
 * precisar digitar a senha de novo.
 */
export async function restaurarSessao(): Promise<User | null> {
  const refresh = lerRefresh();
  if (!refresh) return null;

  try {
    guardarPar(await api.post<ApiTokenPair>("/auth/refresh", { refresh_token: refresh }));
    return await me();
  } catch {
    // Refresh expirado ou revogado: limpa tudo em vez de deixar credencial
    // morta no navegador.
    logout();
    return null;
  }
}
