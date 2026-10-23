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

import { textoDaVersao } from "@compoze/contracts/canonico";
import { semear, type BancoDemo, type ConviteDemo } from "@/demo/semente";
import { apagarDocumentosLocais } from "@/lib/colaboracao";
import type {
  ApiBlock,
  ApiFolder,
  ApiProject,
  ApiProjectDetail,
  ApiSongDetail,
  ApiSongSummary,
  ApiUserMe,
  ApiUserPublic,
  ApiVersion,
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
export async function restaurarDadosDeExemplo(): Promise<void> {
  banco = semear();
  gravar();
  // As letras editadas moram nos documentos do aparelho; sem apagá-los, as
  // canções de exemplo voltariam com o texto de antes.
  await apagarDocumentosLocais();
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

type Rota = (ctx: Contexto) => Response | null | Promise<Response | null>;

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

    if (metodo === "GET" && partes.length === 1 && query.has("q")) {
      const sem = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
      const t = sem((query.get("q") ?? "").trim().replace(/^@/, ""));
      const achados = db.usuarios
        .filter((u) => u.id !== userId && t && (u.username.startsWith(t) || sem(u.name).includes(t)))
        .slice(0, 10);
      return json(achados.map(publico));
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

  // ------------------------------------------------------------ convites
  // Mesmas regras da API (ADR 0010): a dona convida, quem é convidada aceita.
  ({ metodo, partes, corpo, userId }) => {
    const daCancao = partes[0] === "songs" && partes[2] === "invites";
    if (!daCancao && partes[0] !== "invites") return null;
    const db = carregar();
    db.convites ??= [];
    const aberto = (c: ConviteDemo) =>
      !c.accepted_at && !c.declined_at && !c.revoked_at && +new Date(c.expires_at) > Date.now();
    const publicoDoConvite = ({ token: _t, accepted_at: _a, declined_at: _d, revoked_at: _r, ...c }: ConviteDemo) => c;

    if (daCancao) {
      const s = db.musicas.find((x) => x.id === partes[1]);
      if (!s || !podeVer(s, userId!)) return erro(404, "Canção não encontrada.");
      if (s.owner_id !== userId) return erro(403, "Só a dona da canção pode convidar coautores.");
      if (metodo === "GET") {
        return json({ email_enabled: false, invites: db.convites.filter((c) => c.song_id === s.id && aberto(c)).map(publicoDoConvite) });
      }
      if (metodo === "POST") {
        const role = (corpo.role as ConviteDemo["role"]) ?? "COMPOSER";
        const paraConta = typeof corpo.user_id === "string";
        if (paraConta) {
          if (s.collaborators.some((c) => c.user_id === corpo.user_id)) return erro(409, "Essa pessoa já escreve nesta canção.");
          for (const c of db.convites) if (c.song_id === s.id && c.invited_user_id === corpo.user_id && aberto(c)) c.revoked_at = agora();
        }
        const dias = paraConta ? 30 : 7;
        const c: ConviteDemo = {
          id: novoId("i"),
          song_id: s.id,
          kind: paraConta ? "USUARIO" : "LINK",
          role,
          invited_user_id: paraConta ? String(corpo.user_id) : null,
          email: typeof corpo.email === "string" ? corpo.email : null,
          invited_by: userId,
          created_at: agora(),
          expires_at: new Date(Date.now() + dias * 86_400_000).toISOString(),
          token: paraConta ? null : `${novoId("t")}${novoId("t")}${novoId("t")}`,
          accepted_at: null,
          declined_at: null,
          revoked_at: null,
        };
        db.convites.push(c);
        gravar();
        return json({ ...publicoDoConvite(c), token: c.token, emailed: false }, 201);
      }
      if (metodo === "DELETE") {
        const c = db.convites.find((x) => x.id === partes[3] && x.song_id === s.id && aberto(x));
        if (!c) return erro(404, "Convite não encontrado.");
        c.revoked_at = agora();
        gravar();
        return json(null, 204);
      }
      return null;
    }

    const recebido = (c: ConviteDemo) => {
      const s = db.musicas.find((x) => x.id === c.song_id);
      const quem = db.usuarios.find((u) => u.id === c.invited_by);
      return {
        id: c.id,
        kind: c.kind,
        song_id: c.song_id,
        song_title: s?.title ?? "",
        role: c.role,
        invited_by: quem ? { id: quem.id, name: quem.name, username: quem.username } : null,
        created_at: c.created_at,
        expires_at: c.expires_at,
        already_member: !!s?.collaborators.some((x) => x.user_id === userId),
      };
    };
    const conferir = (c: ConviteDemo | undefined) => {
      if (!c) return erro(404, "Convite não encontrado.");
      if (c.accepted_at) return erro(410, "Este convite já foi usado.");
      if (c.declined_at) return erro(410, "Este convite foi recusado.");
      if (c.revoked_at) return erro(410, "Este convite foi cancelado por quem convidou.");
      if (+new Date(c.expires_at) <= Date.now()) return erro(410, "Este convite venceu. Peça um novo.");
      return null;
    };
    const entrar = (c: ConviteDemo) => {
      const s = db.musicas.find((x) => x.id === c.song_id)!;
      if (!s.collaborators.some((x) => x.user_id === userId)) {
        c.accepted_at = agora();
        s.collaborators.push({ id: novoId("c"), user_id: userId!, role: c.role, contribution_percent: 0 });
        s.contributions_confirmed = false;
        s.updated_at = agora();
      }
      gravar();
      return json(s);
    };

    if (metodo === "GET" && partes.length === 1) {
      return json(
        db.convites
          .filter((c) => c.invited_user_id === userId && aberto(c) && !db.musicas.find((s) => s.id === c.song_id)?.deleted_at)
          .map(recebido),
      );
    }
    if (partes[1] === "link") {
      const c = db.convites.find((x) => x.token === partes[2]);
      const ruim = conferir(c);
      if (ruim) return ruim;
      if (metodo === "GET" && partes.length === 3) return json(recebido(c!));
      if (metodo === "POST" && partes[3] === "accept") return entrar(c!);
      return null;
    }
    const c = db.convites.find((x) => x.id === partes[1] && x.invited_user_id === userId);
    const ruim = conferir(c);
    if (ruim) return ruim;
    if (metodo === "POST" && partes[2] === "accept") return entrar(c!);
    if (metodo === "POST" && partes[2] === "decline") {
      c!.declined_at = agora();
      gravar();
      return json(null, 204);
    }
    return null;
  },

  // ------------------------------------------------------------- versões
  // Mesmas regras da API (ADR 0009), com o hash calculado no navegador.
  async ({ metodo, partes, corpo, userId }) => {
    if (partes[0] !== "songs" || !["versions", "register"].includes(partes[2] ?? "")) return null;
    const db = carregar();
    const s = db.musicas.find((x) => x.id === partes[1]);
    if (!s || !podeVer(s, userId!)) return erro(404, "Canção não encontrada.");
    const minhas = (db.versoes ?? []).filter((v) => v.song_id === s.id).sort((a, b) => b.number - a.number);

    if (partes[2] === "versions" && partes.length === 3 && metodo === "GET") {
      return json(minhas.map(({ snapshot, ...resumo }) => resumo));
    }
    if (partes[2] === "versions" && partes.length === 4 && metodo === "GET") {
      const v = minhas.find((x) => x.number === Number(partes[3]));
      return v ? json(v) : erro(404, "Versão não encontrada.");
    }
    if (partes[2] === "versions" && partes.length === 3 && metodo === "POST") {
      return json(await guardarVersao(s, userId!, "MANUAL", (corpo.label as string | undefined) ?? null), 201);
    }
    if (partes[2] === "register" && metodo === "POST") {
      if (s.owner_id !== userId) return erro(403, "Só a dona da canção pode registrar a obra.");
      if (!s.contributions_confirmed) return erro(409, "Feche a divisão de coautoria antes de registrar.");
      s.status = "REGISTRADA";
      s.updated_at = agora();
      const version = await guardarVersao(s, userId!, "REGISTRO", null);
      return json({ song: s, version }, 201);
    }
    return null;
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
      // expand=blocks,collaborators: canções completas, como na API.
      return json(query.get("expand") ? lista : lista.map(resumo));
    }

    if (partes.length === 1 && metodo === "POST") {
      const s: ApiSongDetail = {
        // Como na API: o id pode nascer no aparelho (ADR 0005).
        id: (corpo.id as string | undefined) ?? novoId("s"),
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
        // folha_pautada: false = o aparelho já semeou a folha no documento.
        blocks:
          corpo.folha_pautada === false
            ? []
            : [bloco(uid, "SECTION", "Verso 1", "", 0), bloco(uid, "LYRIC", null, "", 1)],
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
        if (corpo.status === "REGISTRADA" && s.status !== "REGISTRADA") {
          return erro(409, "Para registrar a obra, use Registrar: ele guarda a versão com hash.");
        }
        const mudouDeEstagio = corpo.status !== undefined && corpo.status !== s.status;
        Object.assign(s, corpo);
        tocar();
        // Como na API: mudar de estágio guarda uma versão (ADR 0009).
        if (mudouDeEstagio) void guardarVersao(s, uid, "ESTAGIO", null).then(gravar);
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
        id: (corpo.id as string | undefined) ?? novoId("f"),
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
      return json(db.projetos.filter((p) => p.owner_id === userId && !p.deleted_at).map(projetoCompleto));
    }
    if (partes.length === 1 && metodo === "POST") {
      const p: ApiProject = {
        id: (corpo.id as string | undefined) ?? novoId("p"),
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

/**
 * O que o servidor real faz ao gravar o documento Yjs de uma canção: refaz os
 * blocos da canção a partir dele (ADR 0007). Na demonstração não há
 * WebSocket; o editor chama isto direto, para que listagens e busca vejam o
 * que foi escrito.
 */
export function projetarDocumento(
  songId: string,
  blocos: { id: string; type: ApiBlock["type"]; label: string | null; content: string; author_id: string | null }[],
): void {
  const musica = carregar().musicas.find((m) => m.id === songId);
  if (!musica) return;
  const antes = new Map(musica.blocks.map((b) => [b.id, b]));
  const quando = agora();
  let mudou = blocos.length !== musica.blocks.length;
  musica.blocks = blocos.map((b, position) => {
    const anterior = antes.get(b.id);
    const igual =
      anterior &&
      anterior.position === position &&
      anterior.content === b.content &&
      anterior.label === b.label &&
      anterior.type === b.type;
    if (!igual) mudou = true;
    return {
      ...b,
      position,
      created_at: anterior?.created_at ?? quando,
      updated_at: igual ? anterior.updated_at : quando,
    };
  });
  if (!mudou) return;
  musica.updated_at = quando;
  gravar();
}

async function guardarVersao(
  s: ApiSongDetail,
  uid: string,
  motivo: ApiVersion["reason"],
  label: string | null,
): Promise<ApiVersion> {
  const db = carregar();
  db.versoes ??= [];
  const anterior = db.versoes.filter((v) => v.song_id === s.id).sort((a, b) => b.number - a.number)[0];
  const semHash = {
    song_id: s.id,
    number: (anterior?.number ?? 0) + 1,
    reason: motivo,
    label,
    created_by: uid,
    created_at: agora(),
    previous_sha256: anterior?.sha256 ?? null,
    snapshot: {
      formato: 1 as const,
      song_id: s.id,
      title: s.title,
      status: s.status,
      musical_key: s.musical_key,
      bpm: s.bpm,
      time_signature: s.time_signature,
      tags: s.tags,
      description: s.description,
      blocks: s.blocks.map((b) => ({ id: b.id, type: b.type, label: b.label, content: b.content, author_id: b.author_id })),
      collaborators: s.collaborators.map((c) => {
        const u = db.usuarios.find((x) => x.id === c.user_id);
        return {
          user_id: c.user_id,
          name: u?.name ?? "",
          username: u?.username ?? "",
          role: c.role,
          contribution_percent: c.contribution_percent,
        };
      }),
      contributions_confirmed: s.contributions_confirmed,
    },
  };
  const bytes = new TextEncoder().encode(textoDaVersao(semHash));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const v: ApiVersion = { ...semHash, id: novoId("v"), title: s.title, sha256 };
  db.versoes.push(v);
  return v;
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
    const r = await rota(ctx);
    if (r) {
      gravar();
      return r;
    }
  }

  if (!ctx.userId) return erro(401, "Não autenticado.");
  expurgarLixeira();

  for (const rota of rotasPrivadas) {
    const r = await rota(ctx);
    if (r) {
      gravar();
      return r;
    }
  }
  return erro(404, `Rota não existe no modo demonstração: ${ctx.metodo} ${url.pathname}`);
}
