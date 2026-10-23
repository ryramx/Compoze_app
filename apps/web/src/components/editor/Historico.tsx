import { ArrowLeft, Check, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { quando } from "@/lib/datas";
import { rotuloDoEstagio } from "@/lib/rotulos";
import { PRECISA_DE_REDE, useOnline } from "@/lib/rede";
import { statusDaApi } from "@/services/api/adapters";
import type { ApiSnapshot, ApiVersion, ApiVersionSummary } from "@/services/api/dto";
import * as versoes from "@/services/api/versionService";
import { useCompoze } from "@/store/compozeStore";
import type { Song } from "@/types";

const dataEHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });

/** O que a versão é, numa linha: o nome dado, ou o motivo de ela existir. */
function titulo(v: ApiVersionSummary | ApiVersion, status?: ApiSnapshot["status"]): string {
  if (v.label) return v.label;
  if (v.reason === "REGISTRO") return "Registro da obra";
  if (v.reason === "ESTAGIO") return status ? `Passou a ${rotuloDoEstagio(statusDaApi(status)).toLowerCase()}` : "Mudança de estágio";
  return "Guardada à mão";
}

/**
 * Histórico de versões da canção (ADR 0009): guardar a de agora, ler as
 * antigas, conferir o hash e restaurar o texto de uma delas.
 */
export function Historico({
  musica,
  aberto,
  aoMudar,
  podeEscrever,
  aoRestaurar,
}: {
  musica: Song;
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  podeEscrever: boolean;
  /** Troca os blocos do documento pelos da versão (desfazível). */
  aoRestaurar: (blocos: ApiSnapshot["blocks"]) => void;
}) {
  const online = useOnline();
  const getUser = useCompoze((s) => s.getUser);
  const guardarVersao = useCompoze((s) => s.guardarVersao);
  const [lista, setLista] = useState<ApiVersionSummary[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberta, setAberta] = useState<ApiVersion | null>(null);
  const [conferida, setConferida] = useState<boolean | null>(null);
  const [nome, setNome] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    setErro(null);
    versoes
      .listar(musica.id)
      .then((l) => vivo && setLista(l))
      .catch((e) => vivo && setErro(e instanceof ApiError && e.status === 0 ? "O histórico precisa de internet." : "Não foi possível abrir o histórico."));
    return () => {
      vivo = false;
    };
  }, [aberto, musica.id]);

  useEffect(() => {
    if (!aberto) {
      setAberta(null);
      setConferida(null);
    }
  }, [aberto]);

  async function abrir(numero: number) {
    setConferida(null);
    try {
      setAberta(await versoes.obter(musica.id, numero));
    } catch {
      toast.error("Não foi possível abrir esta versão.");
    }
  }

  async function guardar() {
    setOcupado(true);
    try {
      const v = await guardarVersao(musica.id, nome.trim() || null);
      setLista((l) => [v, ...(l ?? [])]);
      setNome("");
      toast(`Versão ${v.number} guardada.`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível guardar a versão.");
    } finally {
      setOcupado(false);
    }
  }

  async function restaurar(v: ApiVersion) {
    setOcupado(true);
    try {
      // O texto de agora vira versão antes: restaurar nunca perde nada.
      await guardarVersao(musica.id, `Antes de restaurar a versão ${v.number}`);
      aoRestaurar(v.snapshot.blocks);
      aoMudar(false);
      toast(`Texto da versão ${v.number} de volta. Ctrl+Z desfaz.`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível restaurar.");
    } finally {
      setOcupado(false);
    }
  }

  const autora = (id: string | null) => (id ? getUser(id)?.name : undefined);

  return (
    <Dialogo
      aberto={aberto}
      aoMudar={aoMudar}
      largura="lg"
      titulo="Histórico"
      descricao="Retratos da canção. O que foi guardado aqui não muda mais."
    >
      {podeEscrever && !aberta && (
        <div className="mb-5 flex flex-wrap items-end gap-3 border-b border-linha pb-5">
          <label className="min-w-0 flex-1">
            <span className="rotulo mb-1 block">Nome da versão (opcional)</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={80}
              placeholder="antes do refrão novo"
              className="w-full border-b border-linha-forte bg-transparent py-1.5 focus:border-tinta focus:outline-none"
            />
          </label>
          <Botao
            tamanho="sm"
            variante="tinta"
            onClick={() => void guardar()}
            disabled={ocupado || !online}
            title={online ? undefined : PRECISA_DE_REDE}
          >
            Guardar esta versão
          </Botao>
        </div>
      )}

      {aberta ? (
        <VersaoAberta
          v={aberta}
          autora={autora}
          conferida={conferida}
          aoConferir={() => void versoes.conferir(aberta).then(setConferida)}
          aoVoltar={() => setAberta(null)}
          podeRestaurar={podeEscrever && online && !ocupado}
          aoRestaurar={() => void restaurar(aberta)}
        />
      ) : erro ? (
        <p className="py-6 font-serif text-tinta-2 italic">{erro}</p>
      ) : !lista ? (
        <p className="py-6 text-sm text-tinta-3">Abrindo…</p>
      ) : lista.length === 0 ? (
        <p className="py-6 font-serif text-tinta-2 italic">
          Nenhuma versão ainda. Elas nascem quando você guarda uma, quando a canção muda de estágio e no registro.
        </p>
      ) : (
        <ol className="divide-y divide-linha">
          {lista.map((v) => (
            <li key={v.id}>
              <button onClick={() => void abrir(v.number)} className="group flex w-full items-baseline gap-4 py-3 text-left">
                <span className="numeral w-8 shrink-0 text-[12px] text-tinta-3">v{v.number}</span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate group-hover:text-lapis", v.reason === "REGISTRO" && "font-medium")}>
                    {titulo(v)}
                  </span>
                  <span className="block truncate text-[12.5px] text-tinta-3">
                    {v.title}
                    {autora(v.created_by) && ` · ${autora(v.created_by)}`}
                  </span>
                </span>
                <span className="shrink-0 text-[12.5px] text-tinta-3">{quando(v.created_at)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Dialogo>
  );
}

function VersaoAberta({
  v,
  autora,
  conferida,
  aoConferir,
  aoVoltar,
  podeRestaurar,
  aoRestaurar,
}: {
  v: ApiVersion;
  autora: (id: string | null) => string | undefined;
  conferida: boolean | null;
  aoConferir: () => void;
  aoVoltar: () => void;
  podeRestaurar: boolean;
  aoRestaurar: () => void;
}) {
  const r = v.snapshot;
  // Nome de quem escreveu cada bloco, como estava no retrato.
  const nomes = new Map(r.collaborators.map((c) => [c.user_id, c.name]));

  return (
    <div>
      <button onClick={aoVoltar} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-tinta-3 hover:text-tinta">
        <ArrowLeft className="size-3.5" /> Todas as versões
      </button>

      <div className="mb-5">
        <div className="rotulo">
          Versão {v.number} · {dataEHora(v.created_at)}
        </div>
        <h3 className="mt-1 font-serif text-[1.35rem] leading-snug">{titulo(v, r.status)}</h3>
        <p className="mt-0.5 text-[13px] text-tinta-3">
          {r.title} · {rotuloDoEstagio(statusDaApi(r.status))}
          {autora(v.created_by) && ` · guardada por ${autora(v.created_by)}`}
        </p>
      </div>

      <div className="max-h-[38vh] space-y-1.5 overflow-y-auto border-y border-linha py-4">
        {r.blocks.length === 0 && <p className="font-serif text-tinta-3 italic">Folha em branco.</p>}
        {r.blocks.map((b) =>
          b.type === "SECTION" ? (
            <div key={b.id} className="rotulo pt-3 first:pt-0">
              {b.label || b.content || "Seção"}
            </div>
          ) : b.type === "CHORD" ? (
            <div key={b.id} className="font-mono text-[13px] whitespace-pre-wrap text-lapis">
              {b.content}
            </div>
          ) : b.type === "NOTE" ? (
            <div key={b.id} className="text-[13px] whitespace-pre-wrap text-tinta-2 italic">
              {b.content}
            </div>
          ) : (
            <div
              key={b.id}
              className="font-serif text-[1.05rem] whitespace-pre-wrap"
              title={b.author_id ? nomes.get(b.author_id) : undefined}
            >
              {b.content || " "}
            </div>
          ),
        )}
      </div>

      <dl className="mt-4 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px]">
        <dt className="rotulo pt-0.5">Coautoria</dt>
        <dd>
          {r.collaborators.map((c) => `${c.name} ${c.contribution_percent ?? 0}%`).join(" · ")}
          {r.contributions_confirmed ? " (fechada)" : " (em aberto)"}
        </dd>
        <dt className="rotulo pt-0.5">SHA-256</dt>
        <dd className="numeral text-[12px] break-all text-tinta-2">{v.sha256}</dd>
        {v.previous_sha256 && (
          <>
            <dt className="rotulo pt-0.5">Anterior</dt>
            <dd className="numeral text-[12px] break-all text-tinta-3">{v.previous_sha256}</dd>
          </>
        )}
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Botao tamanho="sm" variante="contorno" onClick={aoConferir}>
          Conferir hash
        </Botao>
        {conferida === true && (
          <span className="inline-flex items-center gap-1 text-[13px] text-ok">
            <Check className="size-3.5" /> Confere: o texto é exatamente o que foi guardado.
          </span>
        )}
        {conferida === false && (
          <span className="inline-flex items-center gap-1 text-[13px] text-lapis">
            <ShieldAlert className="size-3.5" /> Não confere. Esta versão foi alterada.
          </span>
        )}
        <span className="flex-1" />
        <Botao
          tamanho="sm"
          variante="texto"
          onClick={aoRestaurar}
          disabled={!podeRestaurar}
          title="Guarda o texto de agora como versão e traz este de volta"
        >
          Restaurar este texto
        </Botao>
      </div>
    </div>
  );
}
