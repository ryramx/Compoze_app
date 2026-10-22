/**
 * Servidor de demonstração: responde às mesmas rotas da API do Compoze, dentro
 * do navegador.
 *
 * Existe para que o frontend rode, seja apresentado e seja testado à mão antes
 * de o backend existir (ADR 0003). Ele fala o contrato da API — `snake_case`,
 * enums em maiúsculas, `detail` nos erros — e não os tipos da interface. Assim
 * os services e os adapters de `src/services/api/` são exercitados exatamente
 * como serão contra o servidor real, e trocar `VITE_API_URL=demo` pela URL da
 * API não muda nenhuma tela.
 *
 * Os dados ficam no `localStorage` do navegador, então o que se edita sobrevive
 * ao recarregar. "Restaurar dados de exemplo" em Ajustes apaga tudo.
 *
 * Não é especificação do backend: as regras aqui são as mínimas para a
 * interface se comportar de forma crível. A referência é docs/backend/.
 */

import { semear, type BancoDemo } from "@/demo/semente";
import type {
  ApiBlock,
  ApiFolder,
  ApiProject,
  ApiProjectDetail,
  ApiSongDetail,
  ApiSongSummary,
  ApiUserMe,
  ApiUserPublic,
} from "@/services/api/dto";

const CHAVE = "compoze.demo.v1";
const RETENCAO_DIAS = 30;

let banco: BancoDemo | null = null;

function carregar(): BancoDemo {
  if (banco) return banco;
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo) banco = JSON.parse(salvo) as BancoDemo;
  } catch {
    // Storage bloqueado ou conteúdo corrompido: recomeça da semente.
  }
  banco ??= semear();
  return banco;
}

function gravar(): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(banco));
  } catch {
    // Sem storage os dados vivem só até o recarregamento. O app segue.
  }
}

/** Volta aos dados de exemplo. Usado em Ajustes. */
export function restaurarDadosDeExemplo(): void {
  banco = semear();
  gravar();
}

// ------------------------------------------------------------- utilidades

const agora = () => new Date().toISOString();
const novoId = (prefixo: string) => `${prefixo}_${Math.random().toString(36).slice(2, 10)}`;

function json(corpo: unknown, status = 200): Response {
  if (status === 204) return new Response(null, { status });
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const erro = (status: number, detail: string) => json({ detail }, status);

/** Simula a latência de rede, para que estados de carregamento apareçam. */
const esperar = () => new Promise((r) => setTimeout(r, 80 + Math.random() * 120));

function usuarioDoToken(cabecalho: string | null): string | null {
  const token = cabecalho?.replace(/^Bearer /, "");
  if (!token?.startsWith("demo-access:")) return null;
  const id = token.slice("demo-access:".length);
  return carregar().usuarios.some((u) => u.id === id) ? id : null;
}

function parDeTokens(userId: string) {
  return {
    access_token: `demo-access:${userId}`,
    refresh_token: `demo-refresh:${userId}`,
    token_type: "bearer",
  };
}

function publico(u: ApiUserMe): ApiUserPublic {
  // Coordenadas e e-mail não saem no perfil público (RN11).
  const { email, show_on_map, latitude, longitude, ...resto } = u;
  return resto;
}

function resumo(s: ApiSongDetail): ApiSongSummary {
  const { description, blocks, collaborators, ...resto } = s;
  return resto;
}

function podeVer(s: ApiSongDetail, userId: string): boolean {
  return s.owner_id === userId || s.collaborators.some((c) => c.user_id === userId);
}

function reposicionar(blocos: ApiBlock[]): ApiBlock[] {
  return blocos
    .sort((a, b) => a.position - b.position)
    .map((b, i) => ({ ...b, position: i }));
}

function projetoCompleto(p: ApiProject): ApiProjectDetail {
  const faixas = carregar().faixas.filter((f) => f.project_id === p.id);
  return {
    ...p,
    songs: faixas
      .sort((a, b) => (a.track_number ?? 0) - (b.track_number ?? 0))
      .map((f) => ({ song_id: f.song_id, track_number: f.track_number })),
  };
}

function expurgarLixeira(): void {
  // O job de expurgo do servidor real (RN08), rodando a cada requisição.
  const db = carregar();
  const limite = Date.now() - RETENCAO_DIAS * 86_400_000;
  const expiradas = new Set(
    db.musicas
      .filter((s) => s.deleted_at && new Date(s.deleted_at).getTime() < limite)
      .map((s) => s.id),
  );
  if (expiradas.size === 0) return;
  db.musicas = db.musicas.filter((s) => !expiradas.has(s.id));
  db.faixas = db.faixas.filter((f) => !expiradas.has(f.song_id));
}

// ------------------------------------------------------------------ rotas

type Contexto = {
  metodo: string;
  partes: string[];
  query: URLSearchParams;
  corpo: Record<string, unknown>;
  userId: string | null;
};

type Rota = (ctx: Contexto) => Response | null;

const rotasPublicas: Rota[] = [
  ({ metodo, partes, corpo }) => {
    if (metodo !== "POST" || partes[0] !== "auth") return null;
    const db = carregar();

    if (partes[1] === "login") {
      const u = db.usuarios.find(
        (x) => x.email.toLowerCase() === String(corpo.email ?? "").toLowerCase(),
      );
      if (!u || db.senhas[u.id] !== corpo.password) return erro(401, "E-mail ou senha incorretos.");
      return json(parDeTokens(u.id));
    }

    if (partes[1] === "register") {
      const email = String(corpo.email ?? "").trim();
      const username = String(corpo.username ?? "").trim().toLowerCase();
      if (db.usuarios.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        return erro(409, "Já existe uma conta com este e-mail.");
      }
      if (db.usuarios.some((u) => u.username === username)) {
        return erro(409, "Este nome de usuário já está em uso.");
      }
      const u: ApiUserMe = {
        id: novoId("u"),
        name: String(corpo.name ?? "").trim(),
        username,
        email,
        bio: null,
        avatar_url: null,
        city: null,
        state: null,
        country: null,
        instruments: [],
        specialties: [],
        genres: [],
        external_links: [],
        show_on_map: false,
        latitude: null,
        longitude: null,
        created_at: agora(),
      };
      db.usuarios.push(u);
      db.senhas[u.id] = String(corpo.password ?? "");
      return json(parDeTokens(u.id), 201);
    }

    if (partes[1] === "refresh") {
      const token = String(corpo.refresh_token ?? "");
      const id = token.startsWith("demo-refresh:") ? token.slice("demo-refresh:".length) : "";
      if (!db.usuarios.some((u) => u.id === id)) return erro(401, "Sessão expirada.");
      return json(parDeTokens(id));
    }
    return null;
  },
];

const rotasPrivadas: Rota[] = [
  // ------------------------------------------------------------ usuários
  ({ metodo, partes, query, corpo, userId }) => {
    if (partes[0] !== "users") return null;
    const db = carregar();

    if (partes[1] === "me") {
      const eu = db.usuarios.find((u) => u.id === userId)!;
      if (metodo === "GET") return json(eu);
      if (metodo === "PATCH") {
        Object.assign(eu, corpo);
        return json(eu);
      }
    }

    if (metodo === "GET" && partes.length === 1) {
      const ids = (query.get("ids") ?? "").split(",").filter(Boolean);
      const lista = ids.length ? db.usuarios.filter((u) => ids.includes(u.id)) : db.usuarios;
      return json(lista.map(publico));
    }

    if (metodo === "GET" && partes.length === 2) {
      const u = db.usuarios.find((x) => x.username === partes[1]);
      return u ? json(publico(u)) : erro(404, "Pessoa não encontrada.");
    }
    return null;
  },

  // ---------------------------------------------------------------- mapa
  ({ metodo, partes }) => {
    if (metodo !== "GET" || partes[0] !== "map" || partes[1] !== "people") return null;
    // Só quem optou por aparecer, e sem e-mail: o mapa mostra posição, não contato.
    return json(
      carregar()
        .usuarios.filter((u) => u.show_on_map && u.latitude !== null)
        .map(({ email, ...resto }) => resto),
    );
  },

  // ------------------------------------------------------------- músicas
  ({ metodo, partes, query, corpo, userId }) => {
    if (partes[0] !== "songs") return null;
    const db = carregar();
    const uid = userId!;

    if (partes.length === 1 && metodo === "GET") {
      const q = (query.get("q") ?? "").toLowerCase();
      const status = query.get("status");
      const pasta = query.get("folder_id");
      const lista = db.musicas
        .filter((s) => !s.deleted_at && podeVer(s, uid))
        .filter((s) => !status || s.status === status)
        .filter((s) => !pasta || s.folder_id === pasta)
        .filter(
          (s) =>
            !q ||
            s.title.toLowerCase().includes(q) ||
            s.tags.some((t) => t.toLowerCase().includes(q)),
        );
      return json(lista.map(resumo));
    }

    if (partes.length === 1 && metodo === "POST") {
      const s: ApiSongDetail = {
        id: novoId("s"),
        title: String(corpo.title ?? "Sem título"),
        status: "IDEIA",
        visibility: "PRIVATE",
        owner_id: uid,
        folder_id: (corpo.folder_id as string | undefined) ?? null,
        musical_key: null,
        bpm: null,
        time_signature: "4/4",
        tags: [],
        contributions_confirmed: false,
        deleted_at: null,
        created_at: agora(),
        updated_at: agora(),
        description: null,
        blocks: [
          bloco(uid, "SECTION", "Verso 1", "", 0),
          bloco(uid, "LYRIC", null, "", 1),
        ],
        collaborators: [
          { id: novoId("c"), user_id: uid, role: "OWNER", contribution_percent: 100 },
        ],
      };
      db.musicas.unshift(s);
      return json(s, 201);
    }

    if (partes[1] === "trash" && metodo === "GET") {
      const lista = db.musicas
        .filter((s) => s.deleted_at && s.owner_id === uid)
        .map((s) => {
          const passados = Math.floor((Date.now() - new Date(s.deleted_at!).getTime()) / 86_400_000);
          return { ...resumo(s), days_remaining: Math.max(0, RETENCAO_DIAS - passados) };
        });
      return json(lista);
    }

    const s = db.musicas.find((x) => x.id === partes[1]);
    if (!s || !podeVer(s, uid)) return erro(404, "Canção não encontrada.");
    const tocar = () => (s.updated_at = agora());

    if (partes.length === 2) {
      if (metodo === "GET") return json(s);
      if (metodo === "PATCH") {
        Object.assign(s, corpo);
        tocar();
        return json(s);
      }
      if (metodo === "DELETE") {
        s.deleted_at = agora();
        return json(null, 204);
      }
    }

    if (partes[2] === "restore" && metodo === "POST") {
      s.deleted_at = null;
      tocar();
      return json(s);
    }

    if (partes[2] === "permanent" && metodo === "DELETE") {
      db.musicas = db.musicas.filter((x) => x.id !== s.id);
      db.faixas = db.faixas.filter((f) => f.song_id !== s.id);
      return json(null, 204);
    }

    if (partes[2] === "blocks") {
      if (metodo === "POST") {
        const posicao =
          typeof corpo.position === "number" ? corpo.position - 0.5 : s.blocks.length;
        s.blocks.push(
          bloco(
            uid,
            corpo.type as ApiBlock["type"],
            (corpo.label as string | null) ?? null,
            String(corpo.content ?? ""),
            posicao,
          ),
        );
        s.blocks = reposicionar(s.blocks);
        tocar();
        return json(s, 201);
      }
      const b = s.blocks.find((x) => x.id === partes[3]);
      if (!b) return erro(404, "Bloco não encontrado.");
      if (metodo === "PATCH") {
        Object.assign(b, corpo, { updated_at: agora() });
        tocar();
        return json(b);
      }
      if (metodo === "DELETE") {
        s.blocks = reposicionar(s.blocks.filter((x) => x.id !== b.id));
        tocar();
        return json(null, 204);
      }
    }

    if (partes[2] === "collaborators") {
      if (metodo === "POST") {
        const alvo = String(corpo.user_id);
        if (!s.collaborators.some((c) => c.user_id === alvo)) {
          s.collaborators.push({
            id: novoId("c"),
            user_id: alvo,
            role: (corpo.role as ApiSongDetail["collaborators"][number]["role"]) ?? "COMPOSER",
            contribution_percent: 0,
          });
          s.contributions_confirmed = false;
        }
        tocar();
        return json(s, 201);
      }
      if (metodo === "DELETE") {
        s.collaborators = s.collaborators.filter((c) => c.user_id !== partes[3]);
        tocar();
        return json(null, 204);
      }
    }

    if (partes[2] === "contributions" && metodo === "PUT") {
      const lista = (corpo.contributions as { user_id: string; percentage: number }[]) ?? [];
      if (corpo.confirm) {
        // RN05: a divisão só fecha quando soma exatamente 100.
        const soma = lista.reduce((a, c) => a + c.percentage, 0);
        if (soma !== 100) return erro(422, `A divisão soma ${soma}%. Precisa fechar em 100%.`);
      }
      for (const c of s.collaborators) {
        const novo = lista.find((x) => x.user_id === c.user_id);
        if (novo) c.contribution_percent = novo.percentage;
      }
      s.contributions_confirmed = Boolean(corpo.confirm);
      tocar();
      return json(s);
    }
    return null;
  },

  // -------------------------------------------------------------- pastas
  ({ metodo, partes, corpo, userId }) => {
    if (partes[0] !== "folders") return null;
    const db = carregar();

    if (partes.length === 1 && metodo === "GET") {
      return json(db.pastas.filter((f) => f.owner_id === userId));
    }
    if (partes.length === 1 && metodo === "POST") {
      const f: ApiFolder = {
        id: novoId("f"),
        name: String(corpo.name ?? "Nova pasta"),
        parent_id: (corpo.parent_id as string | undefined) ?? null,
        owner_id: userId!,
        created_at: agora(),
        updated_at: agora(),
      };
      db.pastas.push(f);
      return json(f, 201);
    }

    const f = db.pastas.find((x) => x.id === partes[1] && x.owner_id === userId);
    if (!f) return erro(404, "Pasta não encontrada.");
    if (metodo === "PATCH") {
      Object.assign(f, corpo, { updated_at: agora() });
      return json(f);
    }
    if (metodo === "DELETE") {
      // Nada do que estava dentro é destruído: subpastas sobem um nível e as
      // músicas ficam sem pasta.
      for (const filha of db.pastas) if (filha.parent_id === f.id) filha.parent_id = f.parent_id;
      for (const s of db.musicas) if (s.folder_id === f.id) s.folder_id = null;
      db.pastas = db.pastas.filter((x) => x.id !== f.id);
      return json(null, 204);
    }
    return null;
  },

  // ------------------------------------------------------------ projetos
  ({ metodo, partes, corpo, userId }) => {
    if (partes[0] !== "projects") return null;
    const db = carregar();

    if (partes.length === 1 && metodo === "GET") {
      return json(db.projetos.filter((p) => p.owner_id === userId && !p.deleted_at));
    }
    if (partes.length === 1 && metodo === "POST") {
      const p: ApiProject = {
        id: novoId("p"),
        name: String(corpo.name ?? "Novo projeto"),
        description: (corpo.description as string | undefined) ?? null,
        type: (corpo.type as ApiProject["type"]) ?? "SINGLE",
        status: "PLANEJAMENTO",
        style: (corpo.style as ApiProject["style"]) ?? null,
        release_date: (corpo.release_date as string | undefined) ?? null,
        cover_url: null,
        estimated_cost: (corpo.estimated_cost as number | undefined) ?? null,
        funding_target: (corpo.funding_target as number | undefined) ?? null,
        funding_current: 0,
        owner_id: userId!,
        deleted_at: null,
        created_at: agora(),
        updated_at: agora(),
      };
      db.projetos.unshift(p);
      return json(projetoCompleto(p), 201);
    }

    const p = db.projetos.find((x) => x.id === partes[1] && x.owner_id === userId);
    if (!p) return erro(404, "Projeto não encontrado.");

    if (partes.length === 2) {
      if (metodo === "GET") return json(projetoCompleto(p));
      if (metodo === "PATCH") {
        Object.assign(p, corpo, { updated_at: agora() });
        return json(projetoCompleto(p));
      }
      if (metodo === "DELETE") {
        p.deleted_at = agora();
        return json(null, 204);
      }
    }
    if (partes[2] === "restore" && metodo === "POST") {
      p.deleted_at = null;
      return json(projetoCompleto(p));
    }
    if (partes[2] === "songs") {
      if (metodo === "POST") {
        const songId = String(corpo.song_id);
        if (!db.faixas.some((f) => f.project_id === p.id && f.song_id === songId)) {
          const total = db.faixas.filter((f) => f.project_id === p.id).length;
          db.faixas.push({
            project_id: p.id,
            song_id: songId,
            track_number: (corpo.track_number as number | undefined) ?? total + 1,
          });
        }
        return json(projetoCompleto(p), 201);
      }
      if (metodo === "DELETE") {
        db.faixas = db.faixas.filter((f) => !(f.project_id === p.id && f.song_id === partes[3]));
        return json(null, 204);
      }
    }
    return null;
  },
];

function bloco(
  autor: string,
  type: ApiBlock["type"],
  label: string | null,
  content: string,
  position: number,
): ApiBlock {
  return {
    id: novoId("b"),
    type,
    label,
    content,
    position,
    author_id: autor,
    created_at: agora(),
    updated_at: agora(),
  };
}

/** Ponto de entrada: recebe o que `fetch` receberia e devolve uma `Response`. */
export async function responder(
  caminho: string,
  init: { method?: string; headers?: Record<string, string>; body?: string },
): Promise<Response> {
  await esperar();
  const url = new URL(caminho, "http://demo");
  const ctx: Contexto = {
    metodo: init.method ?? "GET",
    partes: url.pathname.split("/").filter(Boolean),
    query: url.searchParams,
    corpo: init.body ? (JSON.parse(init.body) as Record<string, unknown>) : {},
    userId: usuarioDoToken(init.headers?.Authorization ?? null),
  };

  for (const rota of rotasPublicas) {
    const r = rota(ctx);
    if (r) {
      gravar();
      return r;
    }
  }

  if (!ctx.userId) return erro(401, "Não autenticado.");
  expurgarLixeira();

  for (const rota of rotasPrivadas) {
    const r = rota(ctx);
    if (r) {
      gravar();
      return r;
    }
  }
  return erro(404, `Rota não existe no modo demonstração: ${ctx.metodo} ${url.pathname}`);
}
