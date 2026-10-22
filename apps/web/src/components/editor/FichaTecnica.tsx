import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Monograma } from "@/components/compoze/Monograma";
import { Botao } from "@/components/ui/Botao";
import { Seletor } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { COMPASSOS, ESTAGIOS, posicaoDoEstagio, TONS } from "@/lib/rotulos";
import { useCompoze } from "@/store/compozeStore";
import type { Song } from "@/types";

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-3 py-2">
      <span className="rotulo">{rotulo}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * Ficha técnica da canção: estágio, dados musicais, organização e coautoria.
 * Fica na margem direita em telas largas e numa folha sobreposta no celular.
 */
export function FichaTecnica({ musica }: { musica: Song }) {
  const atualizar = useCompoze((s) => s.updateSong);
  const pastas = useCompoze((s) => s.folders);
  const getUser = useCompoze((s) => s.getUser);
  const euId = useCompoze((s) => s.currentUserId);
  const definirParte = useCompoze((s) => s.setContribution);
  const confirmarDivisao = useCompoze((s) => s.confirmContributions);
  const removerColaborador = useCompoze((s) => s.removeCollaborator);
  const [novaTag, setNovaTag] = useState("");
  const [convidando, setConvidando] = useState(false);
  const [fechando, setFechando] = useState(false);

  const patch = (p: Partial<Song>) => atualizar(musica.id, p);
  const tags = musica.tags ?? [];
  const total = musica.collaborators.reduce((a, c) => a + c.percentage, 0);
  const souDono = musica.creatorId === euId;
  const pos = posicaoDoEstagio(musica.status);

  function adicionarTag() {
    const t = novaTag.trim().replace(/^#/, "").toLowerCase();
    if (t && !tags.includes(t)) patch({ tags: [...tags, t] });
    setNovaTag("");
  }

  async function fechar() {
    setFechando(true);
    try {
      await confirmarDivisao(musica.id);
      toast("Divisão de coautoria fechada.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível fechar a divisão.");
    } finally {
      setFechando(false);
    }
  }

  return (
    <div className="space-y-9 text-[14px]">
      {/* Estágio */}
      <section>
        <h2 className="rotulo mb-3 text-tinta-2">Estágio</h2>
        <ol className="space-y-px">
          {ESTAGIOS.map((e, i) => (
            <li key={e.valor}>
              <button
                onClick={() => patch({ status: e.valor })}
                aria-pressed={musica.status === e.valor}
                className={cn(
                  "flex w-full items-center gap-3 py-1 text-left transition-colors",
                  i === pos ? "text-tinta" : i < pos ? "text-tinta-2" : "text-tinta-3 hover:text-tinta-2",
                )}
              >
                <span
                  className={cn(
                    "h-[2px] transition-all",
                    i === pos ? "w-6 bg-lapis" : i < pos ? "w-3 bg-tinta-2" : "w-3 bg-linha-forte",
                  )}
                />
                <span className={cn(i === pos && "font-medium")}>{e.rotulo}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      {/* Dados musicais */}
      <section>
        <h2 className="rotulo mb-1 text-tinta-2">Música</h2>
        <div className="divide-y divide-linha border-y border-linha">
          <Linha rotulo="Tom">
            <Seletor value={musica.key ?? ""} onChange={(e) => patch({ key: e.target.value || undefined })} className="numeral border-0 py-0.5 text-sm">
              <option value="">—</option>
              {TONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Seletor>
          </Linha>
          <Linha rotulo="Compasso">
            <Seletor value={musica.timeSignature ?? "4/4"} onChange={(e) => patch({ timeSignature: e.target.value })} className="numeral border-0 py-0.5 text-sm">
              {COMPASSOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Seletor>
          </Linha>
          <Linha rotulo="Andamento">
            <span className="flex items-baseline gap-1.5">
              <input
                type="number"
                inputMode="numeric"
                min={20}
                max={300}
                value={musica.bpm ?? ""}
                placeholder="—"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  patch({ bpm: Number.isFinite(n) && n > 0 ? n : undefined });
                }}
                className="numeral w-14 bg-transparent text-sm placeholder:text-tinta-3 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Batidas por minuto"
              />
              <span className="text-[12px] text-tinta-3">bpm</span>
            </span>
          </Linha>
        </div>
      </section>

      {/* Organização */}
      <section>
        <h2 className="rotulo mb-1 text-tinta-2">Organização</h2>
        <div className="divide-y divide-linha border-y border-linha">
          <Linha rotulo="Pasta">
            <Seletor value={musica.folderId ?? ""} onChange={(e) => patch({ folderId: e.target.value || undefined })} className="border-0 py-0.5 text-sm">
              <option value="">Sem pasta</option>
              {pastas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Seletor>
          </Linha>
          <Linha rotulo="Perfil">
            <button onClick={() => patch({ hidden: !musica.hidden })} className="link-sublinhado text-left text-sm" aria-pressed={!musica.hidden}>
              {musica.hidden ? "Privada — só coautores veem" : "Visível no seu perfil"}
            </button>
          </Linha>
          <div className="py-2.5">
            <div className="flex flex-wrap gap-x-2.5 gap-y-1.5">
              {tags.map((t) => (
                <span key={t} className="group inline-flex items-center gap-0.5 text-[13px] text-tinta-2">
                  #{t}
                  <button onClick={() => patch({ tags: tags.filter((x) => x !== t) })} className="text-tinta-3 opacity-0 group-hover:opacity-100 hover:text-lapis focus:opacity-100" aria-label={`Remover tag ${t}`}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                value={novaTag}
                onChange={(e) => setNovaTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    adicionarTag();
                  }
                }}
                onBlur={adicionarTag}
                placeholder="+ tag"
                className="w-20 bg-transparent text-[13px] placeholder:text-tinta-3 focus:outline-none"
                aria-label="Nova tag"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Coautoria */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="rotulo text-tinta-2">Coautoria</h2>
          <span className={cn("numeral text-[12px]", total === 100 ? "text-ok" : "text-lapis")}>{total}%</span>
        </div>
        <ul className="divide-y divide-linha border-y border-linha">
          {musica.collaborators.map((c) => {
            const u = getUser(c.userId);
            return (
              <li key={c.userId} className="group flex items-center gap-3 py-2.5">
                <Monograma usuario={u} tamanho="xs" />
                <span className="min-w-0 flex-1 truncate">
                  {u?.name ?? "Pessoa"}
                  {c.userId === musica.creatorId && <span className="ml-1.5 text-[11px] text-tinta-3">autora</span>}
                </span>
                <span className="flex items-baseline">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={c.percentage}
                    onChange={(e) => definirParte(musica.id, c.userId, Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="numeral w-9 bg-transparent text-right text-sm focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label={`Parte de ${u?.name}`}
                  />
                  <span className="numeral text-[12px] text-tinta-3">%</span>
                </span>
                {souDono && c.userId !== musica.creatorId ? (
                  <button onClick={() => removerColaborador(musica.id, c.userId)} className="text-tinta-3 opacity-0 group-hover:opacity-100 hover:text-lapis focus:opacity-100" aria-label={`Remover ${u?.name}`}>
                    <X className="size-3.5" />
                  </button>
                ) : (
                  <span className="w-3.5" aria-hidden />
                )}
              </li>
            );
          })}
        </ul>
        {/* Barra de divisão: cada pessoa ocupa a fração da sua parte, na cor de autor. */}
        <div className="mt-3 flex h-1 overflow-hidden bg-linha" aria-hidden>
          {musica.collaborators.map((c) => (
            <span key={c.userId} style={{ width: `${c.percentage}%`, backgroundColor: `var(--autor-${getUser(c.userId)?.authorColor ?? 1})` }} />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Botao tamanho="sm" variante="contorno" onClick={() => setConvidando(true)}>
            <Plus /> Convidar
          </Botao>
          {musica.contributionsConfirmed && total === 100 ? (
            <span className="inline-flex items-center gap-1 text-[13px] text-ok">
              <Check className="size-3.5" /> Divisão fechada
            </span>
          ) : (
            <Botao tamanho="sm" variante="texto" disabled={total !== 100 || fechando} onClick={() => void fechar()} title={total !== 100 ? "A divisão precisa somar 100%" : undefined}>
              Fechar divisão
            </Botao>
          )}
        </div>
        {total !== 100 && (
          <p className="mt-2 text-[12.5px] leading-snug text-tinta-3">
            Enquanto negociam, a soma pode ficar aberta. Para registrar a obra, ela precisa fechar em 100%.
          </p>
        )}
      </section>

      <ConvidarColaborador musica={musica} aberto={convidando} aoMudar={setConvidando} />
    </div>
  );
}

function ConvidarColaborador({ musica, aberto, aoMudar }: { musica: Song; aberto: boolean; aoMudar: (v: boolean) => void }) {
  const pessoas = useCompoze((s) => s.users);
  const convidar = useCompoze((s) => s.inviteCollaborator);
  const [termo, setTermo] = useState("");
  const jaEstao = new Set(musica.collaborators.map((c) => c.userId));
  const t = termo.trim().toLowerCase();
  const candidatos = pessoas
    .filter((u) => !jaEstao.has(u.id))
    .filter((u) => !t || u.name.toLowerCase().includes(t) || u.username.includes(t));

  return (
    <Dialogo
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Convidar para escrever"
      descricao={`Quem entrar passa a editar “${musica.title}” e aparece na divisão com 0% até vocês acertarem.`}
    >
      <input
        autoFocus
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Nome ou @usuário"
        className="mb-3 w-full border-b border-linha-forte bg-transparent py-2 focus:border-tinta focus:outline-none"
      />
      {candidatos.length === 0 ? (
        <p className="py-6 font-serif text-tinta-2 italic">Ninguém com esse nome por aqui.</p>
      ) : (
        <ul className="divide-y divide-linha">
          {candidatos.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-3">
              <Monograma usuario={u} />
              <div className="min-w-0 flex-1">
                <div className="truncate">{u.name}</div>
                <div className="truncate text-[12.5px] text-tinta-3">
                  @{u.username}
                  {u.location.city && ` · ${u.location.city}`}
                </div>
              </div>
              <Botao
                tamanho="sm"
                onClick={() => {
                  convidar(musica.id, u.id);
                  toast(`${u.name.split(" ")[0]} agora escreve com você.`);
                  aoMudar(false);
                }}
              >
                Convidar
              </Botao>
            </li>
          ))}
        </ul>
      )}
    </Dialogo>
  );
}
