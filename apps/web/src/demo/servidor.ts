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
import { conversasDeExemplo, genteDeExemplo, semear, type BancoDemo, type ConversaDemo, type ConviteDemo, type PostDemo } from "@/demo/semente";
import { emitir } from "@/lib/aoVivo";
import { apagarDocumentosLocais } from "@/lib/colaboracao";
import type {
  ApiBlock,
  ApiEntry,
  ApiFolder,
  ApiProject,
  ApiProjectDetail,
  ApiSongDetail,
  ApiSongSummary,
  ApiUserMe,
  ApiUserPublic,
  ApiVersion,
  ApiVoiceMemo,
} from "@/services/api/dto";
import { del as apagarAudio, get as lerAudio, set as guardarAudio } from "idb-keyval";

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

/**
 * Foto e capa na demonstração (ADR 0015): a imagem, já reduzida no aparelho,
 * vira `data:` e fica no próprio registro. Cabe no localStorage porque a
 * redução deixa cada uma em dezenas de KB.
 */
function comoDataUrl(imagem: Blob): Promise<string> {
  return new Promise((ok, falha) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(String(leitor.result));
    leitor.onerror = () => falha(leitor.error);
    leitor.readAsDataURL(imagem);
  });
}

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
  /** Corpo binário (áudio dos memos). */
  bruto: Blob | null;
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
        cover_url: null,
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
  // ----------------------------------------------------------- conversas
  // ADR 0014. "Ao vivo" aqui é o próprio navegador: `emitir` entrega o evento.
  ({ metodo, partes, query, corpo, userId }) => {
    if (partes[0] !== "conversations") return null;
    const db = carregar();
    db.conversas ??= conversasDeExemplo();
    const eu = userId!;
    const pessoa = (id: string) => db.usuarios.find((u) => u.id === id);
    const msg = (c: ConversaDemo, m: ConversaDemo["mensagens"][number]) => ({ ...m, conversation_id: c.id });
    const conversa = (c: ConversaDemo) => {
      const outra = c.membros.find((id) => id !== eu)!;
      const ultima = c.mensagens.at(-1);
      const lida = c.lida[eu];
      return {
        id: c.id,
        other: publico(pessoa(outra)!),
        last_message: ultima ? msg(c, ultima) : null,
        unread_count: c.mensagens.filter((m) => m.author_id !== eu && (!lida || m.created_at > lida)).length,
        created_at: c.criada,
      };
    };
    const minhas = db.conversas.filter((c) => c.membros.includes(eu));

    if (partes.length === 1 && metodo === "GET") {
      return json(
        minhas
          .map(conversa)
          .sort((a, b) => (b.last_message?.created_at ?? b.created_at).localeCompare(a.last_message?.created_at ?? a.created_at)),
      );
    }
    if (partes.length === 1 && metodo === "POST") {
      const outra = String(corpo.user_id ?? "");
      if (outra === eu) return erro(422, "Você não pode conversar consigo mesma.");
      if (!pessoa(outra)) return erro(404, "Pessoa não encontrada.");
      const existente = minhas.find((c) => c.membros.includes(outra));
      if (existente) return json(conversa(existente));
      const nova: ConversaDemo = { id: novoId("c"), membros: [eu, outra], lida: {}, criada: agora(), mensagens: [] };
      db.conversas.push(nova);
      return json(conversa(nova), 201);
    }
    const c = minhas.find((x) => x.id === partes[1]);
    if (!c) return erro(404, "Conversa não encontrada.");
    if (partes.length === 2 && metodo === "GET") return json(conversa(c));
    if (partes[2] === "messages" && metodo === "GET") {
      const lista = [...c.mensagens].reverse();
      const antes = query.get("before");
      const inicio = antes ? lista.findIndex((m) => m.id === antes) + 1 : 0;
      const limite = Number(query.get("limit") ?? 50);
      const pagina = lista.slice(inicio, inicio + limite);
      return json({ items: pagina.map((m) => msg(c, m)), next_cursor: inicio + limite < lista.length ? pagina.at(-1)!.id : null });
    }
    if (partes[2] === "messages" && metodo === "POST") {
      const texto = String(corpo.content ?? "").trim();
      if (!texto) return erro(422, "Escreva alguma coisa.");
      const id = (corpo.id as string | undefined) ?? novoId("m");
      const existente = c.mensagens.find((m) => m.id === id);
      if (existente) return json(msg(c, existente));
      const m = { id, author_id: eu, content: texto, created_at: agora() };
      c.mensagens.push(m);
      c.lida[eu] = m.created_at;
      setTimeout(() => emitir({ type: "message", message: msg(c, m) }), 0);
      return json(msg(c, m), 201);
    }
    if (partes[2] === "read" && metodo === "POST") {
      c.lida[eu] = agora();
      return json(null, 204);
    }
    return null;
  },

  // --------------------------------------------------------------- gente
  // Seguir e mural (ADR 0013), com as mesmas regras da API.
  ({ metodo, partes, query, corpo, userId }) => {
    const social =
      partes[0] === "profiles" ||
      partes[0] === "feed" ||
      partes[0] === "posts" ||
      (partes[0] === "suggestions" && partes[1] === "people") ||
      (partes[0] === "users" && ["follow", "followers", "following"].includes(partes[2] ?? ""));
    if (!social) return null;
    const db = carregar();
    if (!db.posts) Object.assign(db, genteDeExemplo());
    const seguindo = db.seguindo!;
    const posts = db.posts!;
    const comentarios = db.comentarios!;
    const eu = userId!;
    const pessoa = (id: string) => db.usuarios.find((u) => u.id === id);
    const publicacao = (p: PostDemo) => {
      const s = p.song_id ? db.musicas.find((m) => m.id === p.song_id) : undefined;
      return {
        id: p.id,
        author: publico(pessoa(p.author_id)!),
        content: p.content,
        song: s && s.visibility !== "PRIVATE" && !s.deleted_at ? { id: s.id, title: s.title, status: s.status } : null,
        like_count: p.curtidas.length,
        comment_count: comentarios.filter((c) => c.post_id === p.id).length,
        liked_by_me: p.curtidas.includes(eu),
        created_at: p.created_at,
      };
    };

    if (partes[0] === "profiles" && metodo === "GET") {
      const u = db.usuarios.find((x) => x.username === partes[1]);
      if (!u) return erro(404, "Pessoa não encontrada.");
      return json({
        ...publico(u),
        followers_count: seguindo.filter((f) => f.followed_id === u.id).length,
        following_count: seguindo.filter((f) => f.follower_id === u.id).length,
        followed_by_me: seguindo.some((f) => f.follower_id === eu && f.followed_id === u.id),
        follows_me: seguindo.some((f) => f.follower_id === u.id && f.followed_id === eu),
      });
    }
    if (partes[0] === "users") {
      const alvo = partes[1]!;
      if (!pessoa(alvo)) return erro(404, "Pessoa não encontrada.");
      if (partes[2] === "follow") {
        if (alvo === eu) return erro(422, "Você não pode seguir a si mesma.");
        const i = seguindo.findIndex((f) => f.follower_id === eu && f.followed_id === alvo);
        if (metodo === "PUT" && i < 0) seguindo.push({ follower_id: eu, followed_id: alvo, created_at: agora() });
        if (metodo === "DELETE" && i >= 0) seguindo.splice(i, 1);
        return json(null, 204);
      }
      const ids =
        partes[2] === "followers"
          ? seguindo.filter((f) => f.followed_id === alvo).map((f) => f.follower_id)
          : seguindo.filter((f) => f.follower_id === alvo).map((f) => f.followed_id);
      return json(
        ids.map((id) => ({
          ...publico(pessoa(id)!),
          followed_by_me: seguindo.some((f) => f.follower_id === eu && f.followed_id === id),
          follows_me: seguindo.some((f) => f.follower_id === id && f.followed_id === eu),
        })),
      );
    }
    if (partes[0] === "suggestions") {
      const parceiras = new Set(
        db.musicas.filter((m) => podeVer(m, eu)).flatMap((m) => [m.owner_id, ...m.collaborators.map((c) => c.user_id)]),
      );
      return json(
        [...parceiras]
          .filter((id) => id !== eu && !seguindo.some((f) => f.follower_id === eu && f.followed_id === id))
          .map((id) => publico(pessoa(id)!)),
      );
    }
    if (partes[0] === "feed") {
      const autora = query.get("author_id");
      const sigo = new Set([eu, ...seguindo.filter((f) => f.follower_id === eu).map((f) => f.followed_id)]);
      const lista = posts
        .filter((p) => (autora ? p.author_id === autora : sigo.has(p.author_id)))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      const antes = query.get("before");
      const inicio = antes ? lista.findIndex((p) => p.id === antes) + 1 : 0;
      const limite = Number(query.get("limit") ?? 20);
      const pagina = lista.slice(inicio, inicio + limite);
      const temMais = inicio + limite < lista.length;
      return json({ items: pagina.map(publicacao), next_cursor: temMais ? pagina.at(-1)!.id : null });
    }

    // /posts
    if (partes.length === 1 && metodo === "POST") {
      const texto = String(corpo.content ?? "").trim();
      if (!texto) return erro(422, "Escreva alguma coisa.");
      const id = (corpo.id as string | undefined) ?? novoId("post");
      const existente = posts.find((p) => p.id === id);
      if (existente) return existente.author_id === eu ? json(publicacao(existente)) : erro(409, "Já existe uma publicação com este id.");
      const songId = (corpo.song_id as string | null | undefined) ?? null;
      if (songId) {
        const s = db.musicas.find((m) => m.id === songId);
        if (!s || !podeVer(s, eu)) return erro(404, "Canção não encontrada.");
        if (s.visibility === "PRIVATE") return erro(422, "Só dá para citar uma canção que não seja privada.");
      }
      const p: PostDemo = { id, author_id: eu, content: texto, song_id: songId, created_at: agora(), curtidas: [] };
      posts.push(p);
      return json(publicacao(p), 201);
    }
    const p = posts.find((x) => x.id === partes[1]);
    if (!p) return metodo === "DELETE" ? json(null, 204) : erro(404, "Publicação não encontrada.");
    if (partes.length === 2 && metodo === "GET") return json(publicacao(p));
    if (partes.length === 2 && metodo === "DELETE") {
      if (p.author_id !== eu) return erro(403, "Só quem publicou pode apagar.");
      posts.splice(posts.indexOf(p), 1);
      return json(null, 204);
    }
    if (partes[2] === "like") {
      p.curtidas = p.curtidas.filter((id) => id !== eu);
      if (metodo === "PUT") p.curtidas.push(eu);
      return json(publicacao(p));
    }
    if (partes[2] === "comments") {
      if (metodo === "GET") {
        return json(
          comentarios
            .filter((c) => c.post_id === p.id)
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map((c) => ({ id: c.id, post_id: c.post_id, author: publico(pessoa(c.author_id)!), content: c.content, created_at: c.created_at })),
        );
      }
      if (metodo === "POST") {
        const texto = String(corpo.content ?? "").trim();
        if (!texto) return erro(422, "Escreva alguma coisa.");
        const c = { id: (corpo.id as string | undefined) ?? novoId("com"), post_id: p.id, author_id: eu, content: texto, created_at: agora() };
        comentarios.push(c);
        return json({ ...c, author: publico(pessoa(eu)!) }, 201);
      }
      if (metodo === "DELETE") {
        const c = comentarios.find((x) => x.id === partes[3] && x.post_id === p.id);
        if (c && c.author_id !== eu && p.author_id !== eu) return erro(403, "Só quem comentou ou quem publicou pode apagar.");
        if (c) comentarios.splice(comentarios.indexOf(c), 1);
        return json(null, 204);
      }
    }
    return null;
  },

  // ------------------------------------------------------------ usuários
  async ({ metodo, partes, query, corpo, bruto, userId }) => {
    if (partes[0] !== "users") return null;
    const db = carregar();

    if (partes[1] === "me") {
      const eu = db.usuarios.find((u) => u.id === userId)!;
      if (partes[2] === "avatar" || partes[2] === "cover") {
        const campo = partes[2] === "avatar" ? "avatar_url" : "cover_url";
        if (metodo === "PUT" && !bruto?.size) return erro(422, "A imagem veio vazia.");
        if (metodo === "PUT") eu[campo] = await comoDataUrl(bruto!);
        if (metodo === "DELETE") eu[campo] = null;
        return json(eu);
      }
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

  // ------------------------------------------------------------- memos
  // ADR 0012. O áudio vai para o IndexedDB, que aguenta bytes; o resto, para
  // o banco da demonstração como as outras coisas.
  async ({ metodo, partes, query, corpo, bruto, userId }) => {
    if (partes[0] !== "songs" || partes[2] !== "memos") return null;
    const db = carregar();
    db.memos ??= [];
    const s = db.musicas.find((x) => x.id === partes[1]);
    if (!s || !podeVer(s, userId!)) return erro(404, "Canção não encontrada.");
    const chaveDoAudio = (id: string) => `compoze.demo.memo:${id}`;
    if (partes.length === 3 && metodo === "GET") {
      return json(db.memos.filter((m) => m.song_id === s.id).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }
    const id = partes[3]!;
    const m = db.memos.find((x) => x.id === id && x.song_id === s.id);
    if (metodo === "PUT" && partes.length === 4) {
      if (m) return json(m);
      if (!bruto || bruto.size === 0) return erro(422, "O áudio veio vazio.");
      const novo: ApiVoiceMemo = {
        id,
        song_id: s.id,
        author_id: userId,
        title: query.get("title") ?? "",
        duration_ms: Number(query.get("duration_ms") ?? 0),
        mime_type: bruto.type.split(";")[0]!,
        size_bytes: bruto.size,
        created_at: agora(),
      };
      await guardarAudio(chaveDoAudio(id), bruto);
      db.memos.push(novo);
      return json(novo, 201);
    }
    if (!m) return erro(404, "Memo não encontrado.");
    if (metodo === "GET" && partes[4] === "audio") {
      const som = await lerAudio<Blob>(chaveDoAudio(id));
      return som ? new Response(som, { headers: { "content-type": m.mime_type } }) : erro(404, "Memo não encontrado.");
    }
    if (m.author_id !== userId && s.owner_id !== userId) return erro(403, "Só quem gravou ou a dona da canção mexe neste memo.");
    if (metodo === "PATCH") {
      m.title = String(corpo.title ?? "").trim();
      return json(m);
    }
    if (metodo === "DELETE") {
      db.memos = db.memos.filter((x) => x.id !== id);
      await apagarAudio(chaveDoAudio(id));
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
  async ({ metodo, partes, corpo, bruto, userId }) => {
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
    if (partes[2] === "cover") {
      if (metodo === "PUT" && !bruto?.size) return erro(422, "A imagem veio vazia.");
      p.cover_url = metodo === "PUT" ? await comoDataUrl(bruto!) : null;
      return json(projetoCompleto(p));
    }
    if (partes[2] === "restore" && metodo === "POST") {
      p.deleted_at = null;
      return json(projetoCompleto(p));
    }
    if (partes[2] === "entries") {
      // Entradas e custos (ADR 0021): entrada soma no arrecadado.
      db.lancamentos ??= [];
      const somar = (l: ApiEntry, sinal: 1 | -1) => {
        if (l.kind === "ENTRADA") p.funding_current = Math.max(0, p.funding_current + sinal * l.amount);
      };
      if (partes.length === 3 && metodo === "GET") {
        return json(
          db.lancamentos
            .filter((l) => l.project_id === p.id)
            .sort((a, b) => (b.occurred_on ?? "").localeCompare(a.occurred_on ?? "") || a.created_at.localeCompare(b.created_at)),
        );
      }
      if (partes.length === 3 && metodo === "POST") {
        const ja = db.lancamentos.find((l) => l.id === corpo.id);
        if (ja) return json(ja, 201);
        const descricao = String(corpo.description ?? "").trim();
        const valor = Number(corpo.amount);
        if (!descricao || !Number.isInteger(valor) || valor < 1) return erro(422, "Dê um nome e um valor maior que zero.");
        const l: ApiEntry = {
          id: (corpo.id as string | undefined) ?? novoId("l"),
          project_id: p.id,
          kind: corpo.kind === "ENTRADA" ? "ENTRADA" : "CUSTO",
          description: descricao,
          category: (corpo.category as string | null | undefined) || null,
          amount: valor,
          occurred_on: (corpo.occurred_on as string | null | undefined) ?? null,
          created_at: agora(),
          updated_at: agora(),
        };
        db.lancamentos.push(l);
        somar(l, 1);
        return json(l, 201);
      }
      const l = db.lancamentos.find((x) => x.id === partes[3] && x.project_id === p.id);
      if (!l) return erro(404, "Lançamento não encontrado.");
      if (metodo === "PATCH") {
        somar(l, -1);
        Object.assign(l, corpo, { updated_at: agora() });
        somar(l, 1);
        return json(l);
      }
      if (metodo === "DELETE") {
        somar(l, -1);
        db.lancamentos = db.lancamentos.filter((x) => x !== l);
        return json(null, 204);
      }
    }
    if (partes[2] === "songs") {
      const doProjeto = db.faixas.filter((f) => f.project_id === p.id);
      if (metodo === "POST") {
        const songId = String(corpo.song_id);
        const numero = corpo.track_number as number | undefined;
        if (!doProjeto.some((f) => f.song_id === songId)) {
          // Número à mão pode pular, mas não repetir (ADR 0021).
          if (numero !== undefined && doProjeto.some((f) => f.track_number === numero)) {
            return erro(409, `Já existe uma faixa ${numero} neste projeto.`);
          }
          const maior = doProjeto.reduce((m, f) => Math.max(m, f.track_number ?? 0), 0);
          db.faixas.push({ project_id: p.id, song_id: songId, track_number: numero ?? maior + 1 });
        }
        return json(projetoCompleto(p), 201);
      }
      if (metodo === "PATCH") {
        const faixa = doProjeto.find((f) => f.song_id === partes[3]);
        if (!faixa) return erro(404, "Essa canção não é faixa do projeto.");
        const numero = Number(corpo.track_number);
        // Número ocupado: as duas faixas trocam.
        const outra = doProjeto.find((f) => f.track_number === numero);
        if (outra) outra.track_number = faixa.track_number;
        faixa.track_number = numero;
        return json(projetoCompleto(p));
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
  init: { method?: string; headers?: Record<string, string>; body?: string | Blob },
): Promise<Response> {
  await esperar();
  const url = new URL(caminho, "http://demo");
  const ctx: Contexto = {
    metodo: init.method ?? "GET",
    partes: url.pathname.split("/").filter(Boolean),
    query: url.searchParams,
    corpo: typeof init.body === "string" && init.body ? (JSON.parse(init.body) as Record<string, unknown>) : {},
    bruto: init.body instanceof Blob ? init.body : null,
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
