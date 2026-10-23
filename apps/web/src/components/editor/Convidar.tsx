import { Copy, Link2, Share2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Monograma } from "@/components/compoze/Monograma";
import { Botao } from "@/components/ui/Botao";
import { Seletor } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { ApiError } from "@/lib/api";
import { PRECISA_DE_REDE, useOnline } from "@/lib/rede";
import { PAPEIS, rotuloDoPapel } from "@/lib/rotulos";
import type { ApiInvite } from "@/services/api/dto";
import * as convites from "@/services/api/inviteService";
import * as pessoasApi from "@/services/api/userService";
import { useCompoze } from "@/store/compozeStore";
import type { Song, User } from "@/types";

type Papel = (typeof PAPEIS)[number]["valor"];

const mensagem = (e: unknown, padrao: string) => (e instanceof ApiError && e.status !== 0 ? e.message : padrao);

const venceEm = (iso: string) => {
  const dias = Math.max(1, Math.round((+new Date(iso) - Date.now()) / 86_400_000));
  return dias === 1 ? "vence amanhã" : `vence em ${dias} dias`;
};

/**
 * Convidar para escrever (ADR 0010). Pela conta: busca por nome ou @ em todo
 * o Compoze, e a pessoa aceita ou recusa no app dela. Por link: para quem
 * ainda não tem conta; a dona copia e manda por onde quiser.
 */
export function Convidar({ musica, aberto, aoMudar }: { musica: Song; aberto: boolean; aoMudar: (v: boolean) => void }) {
  const online = useOnline();
  const getUser = useCompoze((s) => s.getUser);
  const [papel, setPapel] = useState<Papel>("COMPOSER");
  const [termo, setTermo] = useState("");
  const [achados, setAchados] = useState<User[] | null>(null);
  const [abertos, setAbertos] = useState<ApiInvite[]>([]);
  const [emailLigado, setEmailLigado] = useState(false);
  const [nomes, setNomes] = useState<Record<string, User>>({});
  const [link, setLink] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const jaEstao = useMemo(() => new Set(musica.collaborators.map((c) => c.userId)), [musica.collaborators]);
  const convidados = useMemo(() => new Set(abertos.map((c) => c.invited_user_id).filter(Boolean)), [abertos]);
  const pessoa = (id: string) => nomes[id] ?? getUser(id);

  // Convites abertos da canção, cada vez que o diálogo abre.
  useEffect(() => {
    if (!aberto || !online) return;
    let vivo = true;
    setLink(null);
    convites
      .daCancao(musica.id)
      .then(async (r) => {
        if (!vivo) return;
        setAbertos(r.invites);
        setEmailLigado(r.email_enabled);
        const faltando = r.invites.map((c) => c.invited_user_id).filter((id): id is string => !!id && !getUser(id));
        if (faltando.length) {
          const gente = await pessoasApi.getMany(faltando);
          if (vivo) setNomes((n) => ({ ...n, ...Object.fromEntries(gente.map((u) => [u.id, u])) }));
        }
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [aberto, online, musica.id, getUser]);

  // Busca enquanto digita, com uma pausa curta para não perguntar a cada letra.
  useEffect(() => {
    const t = termo.trim().replace(/^@/, "");
    if (!t || !online) {
      setAchados(null);
      return;
    }
    let vivo = true;
    const espera = setTimeout(() => {
      pessoasApi
        .buscar(t)
        .then((r) => vivo && setAchados(r))
        .catch(() => vivo && setAchados([]));
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(espera);
    };
  }, [termo, online]);

  async function convidar(u: User) {
    setOcupado(true);
    try {
      const c = await convites.convidarConta(musica.id, u.id, papel);
      setNomes((n) => ({ ...n, [u.id]: u }));
      setAbertos((l) => [c, ...l.filter((x) => x.invited_user_id !== u.id)]);
      toast(`Convite enviado. ${u.name.split(" ")[0]} entra quando aceitar.`);
    } catch (e) {
      toast.error(mensagem(e, "Não foi possível convidar."));
    } finally {
      setOcupado(false);
    }
  }

  async function criarLink() {
    setOcupado(true);
    try {
      const c = await convites.criarLink(musica.id, { role: papel, email: email.trim() || undefined });
      setLink(convites.enderecoDoLink(c.token!));
      setAbertos((l) => [c, ...l]);
      if (c.emailed) toast(`Link enviado para ${c.email}.`);
      setEmail("");
    } catch (e) {
      toast.error(mensagem(e, "Não foi possível criar o link."));
    } finally {
      setOcupado(false);
    }
  }

  async function cancelar(c: ApiInvite) {
    try {
      await convites.cancelar(musica.id, c.id);
      setAbertos((l) => l.filter((x) => x.id !== c.id));
    } catch (e) {
      toast.error(mensagem(e, "Não foi possível cancelar."));
    }
  }

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast("Link copiado.");
    } catch {
      toast.error("Não deu para copiar. Selecione o link e copie à mão.");
    }
  }

  const podeCompartilhar = typeof navigator !== "undefined" && "share" in navigator;
  const texto = `Vem escrever “${musica.title}” comigo no Compoze:`;

  return (
    <Dialogo
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Convidar para escrever"
      descricao={`Quem aceitar passa a editar “${musica.title}” e entra na divisão com 0% até vocês acertarem.`}
    >
      {!online ? (
        <p className="py-6 font-serif text-tinta-2 italic">{PRECISA_DE_REDE}</p>
      ) : (
        <>
          <label className="mb-4 flex items-baseline gap-3 text-[13px] text-tinta-2">
            <span className="shrink-0 whitespace-nowrap">Entra como</span>
            <Seletor value={papel} onChange={(e) => setPapel(e.target.value as Papel)} className="border-0 py-0.5 text-sm text-tinta">
              {PAPEIS.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
            </Seletor>
          </label>

          <input
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Nome ou @usuário"
            aria-label="Buscar pessoa por nome ou @usuário"
            className="mb-1 w-full border-b border-linha-forte bg-transparent py-2 focus:border-tinta focus:outline-none"
          />
          {achados &&
            (achados.length === 0 ? (
              <p className="py-5 font-serif text-tinta-2 italic">Ninguém com esse nome ou @ no Compoze. Mande um link.</p>
            ) : (
              <ul className="divide-y divide-linha">
                {achados.map((u) => {
                  const esta = jaEstao.has(u.id);
                  const esperando = convidados.has(u.id);
                  return (
                    <li key={u.id} className="flex items-center gap-3 py-3">
                      <Monograma usuario={u} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{u.name}</div>
                        <div className="truncate text-[12.5px] text-tinta-3">
                          @{u.username}
                          {u.location.city && ` · ${u.location.city}`}
                        </div>
                      </div>
                      {esta ? (
                        <span className="text-[12.5px] text-tinta-3">já escreve aqui</span>
                      ) : (
                        <Botao tamanho="sm" disabled={ocupado} onClick={() => void convidar(u)}>
                          {esperando ? "Convidar de novo" : "Convidar"}
                        </Botao>
                      )}
                    </li>
                  );
                })}
              </ul>
            ))}

          <section className="mt-6 border-t border-linha pt-5">
            <h3 className="rotulo mb-1 text-tinta-2">Quem ainda não tem conta</h3>
            <p className="mb-3 text-[13px] leading-snug text-tinta-3">
              Um link que vale uma vez, por 7 dias. Quem abrir cria a conta e já entra na canção.
            </p>
            {link ? (
              <div>
                <input
                  readOnly
                  value={link}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Link do convite"
                  className="numeral w-full border-b border-linha-forte bg-transparent py-1.5 text-[12.5px] text-tinta-2 focus:outline-none"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Botao tamanho="sm" variante="tinta" onClick={() => void copiar()}>
                    <Copy /> Copiar link
                  </Botao>
                  {podeCompartilhar && (
                    <Botao
                      tamanho="sm"
                      onClick={() => void navigator.share({ title: "Convite do Compoze", text: texto, url: link }).catch(() => undefined)}
                    >
                      <Share2 /> Compartilhar
                    </Botao>
                  )}
                </div>
                <p className="mt-2 text-[12.5px] text-tinta-3">Guarde agora: por segurança, este link não aparece de novo.</p>
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                {emailLigado && (
                  <label className="min-w-0 flex-1">
                    <span className="rotulo mb-1 block">E-mail (opcional)</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="amiga@exemplo.com"
                      className="w-full border-b border-linha-forte bg-transparent py-1.5 focus:border-tinta focus:outline-none"
                    />
                  </label>
                )}
                <Botao tamanho="sm" disabled={ocupado} onClick={() => void criarLink()}>
                  <Link2 /> {email.trim() ? "Mandar o link" : "Criar link de convite"}
                </Botao>
              </div>
            )}
          </section>

          {abertos.length > 0 && (
            <section className="mt-6 border-t border-linha pt-5">
              <h3 className="rotulo mb-2 text-tinta-2">Esperando resposta</h3>
              <ul className="divide-y divide-linha">
                {abertos.map((c) => {
                  const u = c.invited_user_id ? pessoa(c.invited_user_id) : undefined;
                  return (
                    <li key={c.id} className="flex items-center gap-3 py-2.5 text-[14px]">
                      <span className="min-w-0 flex-1 truncate">
                        {u ? u.name : c.email ? `Link para ${c.email}` : "Link de convite"}
                        <span className="ml-1.5 text-[12px] text-tinta-3">
                          {rotuloDoPapel(c.role)} · {venceEm(c.expires_at)}
                        </span>
                      </span>
                      <button
                        onClick={() => void cancelar(c)}
                        className="text-tinta-3 hover:text-lapis"
                        aria-label="Cancelar convite"
                        title="Cancelar convite"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </Dialogo>
  );
}
