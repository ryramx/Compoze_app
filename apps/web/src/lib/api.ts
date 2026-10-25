// Camada de transporte com a API do Compoze. Este arquivo conhece HTTP, token e
// formato de erro — e nada de domínio. Os endpoints de música, projeto etc.
// ficam em src/services/api/, sobre este client. O contrato está descrito em
// docs/backend/contrato-da-api.md.

const BASE_URL = import.meta.env.VITE_API_URL;

/**
 * `VITE_API_URL=demo` troca a rede pelo servidor de demonstração que roda no
 * navegador (ADR 0003). Tudo acima do `fetch` — tokens, erros, services e
 * adapters — continua igual, que é o que torna a demonstração fiel.
 */
export const MODO_DEMO = BASE_URL === "demo";

if (!BASE_URL) {
  // Falha cedo e com mensagem clara: sem isso o erro só apareceria como um
  // fetch para "undefined/songs", que não diz nada a quem está depurando.
  throw new Error(
    "VITE_API_URL não definida. Copie .env.example para .env antes de rodar o app.",
  );
}

/** Erro de resposta da API. Carrega o status para quem precisa distinguir 401 de 422. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Token ausente, inválido ou expirado. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Autenticado, mas sem permissão sobre o recurso (PRD §26). */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** Falha de validação do Pydantic. */
  get isValidationError(): boolean {
    return this.status === 422;
  }
}

const TOKEN_KEY = "compoze.accessToken";

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // Modo privado ou storage bloqueado: trata como deslogado em vez de quebrar.
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  try {
    if (token === null) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Sem storage a sessão não sobrevive ao reload, mas o app segue funcionando.
  }
}

export type Metodo = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type RequestOptions = {
  method?: Metodo;
  /** JSON, ou um `Blob` que vai cru com o tipo dele (áudio dos memos). */
  body?: unknown;
  /** Resposta em bytes em vez de JSON. */
  binaria?: boolean;
  signal?: AbortSignal;
  /** Reenviar com a mesma chave não repete a escrita (ADR 0008). */
  idempotencyKey?: string;
};

let renovador: (() => Promise<boolean>) | null = null;

/**
 * Quem sabe renovar a sessão (o authService) se registra aqui. Fica do lado
 * de lá para este arquivo continuar sem saber nada de rotas de domínio.
 */
export function definirRenovador(fn: () => Promise<boolean>): void {
  renovador = fn;
}

/** Renova a sessão por fora de `request` (o fluxo ao vivo, que usa fetch direto). */
export const renovarSessao = (): Promise<boolean> => renovador?.() ?? Promise.resolve(false);

/** Endereço da API, para quem fala com ela sem passar por `request`. */
export const URL_DA_API = BASE_URL;

async function request<T>(path: string, options: RequestOptions = {}, repetida = false): Promise<T> {
  const { method = "GET", body, signal, idempotencyKey, binaria } = options;
  const crua = body instanceof Blob;

  const headers: Record<string, string> = {};
  if (crua) headers["Content-Type"] = body.type || "application/octet-stream";
  else if (body !== undefined) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    const init = {
      method,
      headers,
      body: crua ? body : body === undefined ? undefined : JSON.stringify(body),
      signal,
    };
    response = MODO_DEMO
      ? await (await import("@/demo/servidor")).responder(path, init)
      : await fetch(`${BASE_URL}${path}`, init);
  } catch (cause) {
    // Backend fora do ar, DNS, CORS: não há status HTTP para reportar.
    if (signal?.aborted) throw cause;
    throw new ApiError(0, "Não foi possível conectar à API do Compoze.", cause);
  }

  if (response.status === 204) return undefined as T;
  if (binaria && response.ok) return (await response.blob()) as T;

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  // Access token venceu no meio do uso: renova uma vez e repete. As rotas de
  // /auth ficam de fora, senão um refresh recusado tentaria se renovar.
  if (response.status === 401 && !repetida && renovador && !path.startsWith("/auth/") && (await renovador())) {
    return request<T>(path, options, true);
  }

  if (!response.ok) {
    // FastAPI devolve o motivo em `detail`, string ou lista de erros do Pydantic.
    const detail = (payload as { detail?: unknown } | null)?.detail;
    const message =
      typeof detail === "string" ? detail : `Erro ${response.status} na API.`;
    throw new ApiError(response.status, message, detail);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  /** Bytes crus de ida (PUT com Blob) ou de volta (GET binário). */
  subir: <T>(path: string, corpo: Blob) => request<T>(path, { method: "PUT", body: corpo }),
  baixar: (path: string, signal?: AbortSignal) => request<Blob>(path, { signal, binaria: true }),
  /** Escrita da fila do aparelho, com chave de idempotência. */
  enviar: <T>(method: Metodo, path: string, body: unknown, idempotencyKey: string) =>
    request<T>(path, { method, body, idempotencyKey }),
};
