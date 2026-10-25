import { normalizarChavePix, type NovoPixDoProjeto, type TipoDeChavePix } from "@compoze/contracts/apoios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { TituloDeSecao } from "@/components/compoze/Cabecalho";
import { Monograma } from "@/components/compoze/Monograma";
import { Botao } from "@/components/ui/Botao";
import { Campo, Entrada, Seletor } from "@/components/ui/Campo";
import { ApiError } from "@/lib/api";
import { dataLonga } from "@/lib/datas";
import { ENDERECO_PUBLICO } from "@/lib/nativo";
import { reais } from "@/lib/rotulos";
import * as apoios from "@/services/api/apoioService";
import { usuarioDaApi } from "@/services/api/adapters";
import { useCompoze } from "@/store/compozeStore";

const TIPOS: Record<TipoDeChavePix, string> = {
  EVP: "Chave aleatória",
  EMAIL: "E-mail",
  PHONE: "Celular",
  CPF: "CPF",
  CNPJ: "CNPJ",
};

const motivo = (e: unknown, padrao: string) => (e instanceof ApiError && e.status !== 0 ? e.message : padrao);

/**
 * Apoio por PIX, do lado da dona do projeto (Fase 4d, ADR 0018): a chave
 * que recebe, o link para divulgar e os apoios para conferir no extrato.
 */
export function ApoioPorPix({ projetoId }: { projetoId: string }) {
  const cliente = useQueryClient();
  const recarregar = useCompoze((s) => s.loadProject);
  const { data: pix, isPending } = useQuery({ queryKey: ["pix", projetoId], queryFn: () => apoios.pix(projetoId) });
  const { data: lista = [] } = useQuery({
    queryKey: ["apoios", projetoId],
    queryFn: () => apoios.recebidos(projetoId),
    enabled: !!pix,
  });
  const [editando, setEditando] = useState(false);

  const decidir = useMutation({
    mutationFn: ({ id, ok }: { id: string; ok: boolean }) => (ok ? apoios.confirmar(projetoId, id) : apoios.recusar(projetoId, id)),
    onSuccess: async (_, { ok }) => {
      await cliente.invalidateQueries({ queryKey: ["apoios", projetoId] });
      // O arrecadado do projeto mudou no servidor.
      if (ok) await recarregar(projetoId).catch(() => undefined);
    },
    onError: (e) => toast.error(motivo(e, "Sem conexão. Tente de novo quando a internet voltar.")),
  });

  if (isPending) return null;
  const link = `${ENDERECO_PUBLICO}/apoiar/${projetoId}`;
  const paraConferir = lista.filter((a) => a.status === "PENDENTE" && a.paid_claimed_at);
  const decididos = lista.filter((a) => a.status !== "PENDENTE");

  return (
    <section className="mt-16">
      <TituloDeSecao>Apoio por PIX</TituloDeSecao>
      {!pix || editando ? (
        <FormularioDaChave projetoId={projetoId} atual={pix ?? null} aoTerminar={() => setEditando(false)} />
      ) : (
        <div className="space-y-6 pt-3">
          <p className="max-w-xl text-[14px] text-tinta-2">
            {pix.open ? "Recebendo apoio" : "Apoio pausado"} na chave {TIPOS[pix.key_type].toLowerCase()}{" "}
            <span className="font-mono text-[13px]">{pix.key}</span>, em nome de {pix.receiver_name}. O dinheiro vai direto para essa conta; o
            Compoze só anota o que você confirmar.
          </p>
          <div className="flex flex-wrap gap-2">
            <Botao
              variante="tinta"
              onClick={() =>
                void navigator.clipboard.writeText(link).then(
                  () => toast("Link copiado. Mande para quem quer apoiar."),
                  () => toast(link),
                )
              }
            >
              Copiar link de apoio
            </Botao>
            <Botao onClick={() => setEditando(true)}>Trocar chave</Botao>
          </div>

          {paraConferir.length > 0 && (
            <div>
              <h3 className="rotulo mb-3">Para conferir no extrato</h3>
              <ul className="divide-y divide-linha border-y border-linha">
                {paraConferir.map((a) => {
                  const quem = a.supporter ? usuarioDaApi(a.supporter) : undefined;
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-4 py-3">
                      <Monograma usuario={quem} tamanho="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px]">
                          <span className="font-medium">{quem?.name ?? "Alguém"}</span> diz que mandou{" "}
                          <span className="numeral">{reais(a.amount)}</span>
                        </p>
                        <p className="text-[12px] text-tinta-3">
                          Identificador <span className="font-mono">{a.txid}</span> · {dataLonga(a.paid_claimed_at!)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Botao tamanho="sm" variante="tinta" disabled={decidir.isPending} onClick={() => decidir.mutate({ id: a.id, ok: true })}>
                          Chegou
                        </Botao>
                        <Botao tamanho="sm" variante="texto" disabled={decidir.isPending} onClick={() => decidir.mutate({ id: a.id, ok: false })}>
                          Não chegou
                        </Botao>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {decididos.length > 0 && (
            <div>
              <h3 className="rotulo mb-3">Já conferidos</h3>
              <ul className="space-y-1.5 text-[13.5px] text-tinta-2">
                {decididos.map((a) => (
                  <li key={a.id} className={a.status === "RECUSADO" ? "text-tinta-3 line-through" : undefined}>
                    {a.supporter?.name ?? "Alguém"} · <span className="numeral">{reais(a.amount)}</span>
                    {a.status === "RECUSADO" && " · não chegou"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function FormularioDaChave({
  projetoId,
  atual,
  aoTerminar,
}: {
  projetoId: string;
  atual: { key_type: TipoDeChavePix; key: string; receiver_name: string; city: string; open: boolean } | null;
  aoTerminar: () => void;
}) {
  const cliente = useQueryClient();
  const eu = useCompoze((s) => s.users.find((u) => u.id === s.currentUserId));
  const [tipo, setTipo] = useState<TipoDeChavePix>(atual?.key_type ?? "EVP");
  const [chave, setChave] = useState(atual?.key ?? "");
  const [nome, setNome] = useState(atual?.receiver_name ?? (eu?.name ?? "").slice(0, 25));
  const [cidade, setCidade] = useState(atual?.city ?? (eu?.location.city ?? "").slice(0, 15));
  const [aberto, setAberto] = useState(atual?.open ?? true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => setErro(null), [tipo, chave]);

  const salvar = useMutation({
    mutationFn: (d: NovoPixDoProjeto) => apoios.definirPix(projetoId, d),
    onSuccess: (pix) => {
      cliente.setQueryData(["pix", projetoId], pix);
      toast(pix.open ? "Pronto: o projeto está recebendo apoio." : "Chave guardada; o apoio está pausado.");
      aoTerminar();
    },
    onError: (e) => toast.error(motivo(e, "Sem conexão. Tente de novo quando a internet voltar.")),
  });
  const parar = useMutation({
    mutationFn: () => apoios.removerPix(projetoId),
    onSuccess: () => {
      cliente.setQueryData(["pix", projetoId], null);
      toast("O projeto parou de receber apoio.");
      aoTerminar();
    },
    onError: (e) => toast.error(motivo(e, "Sem conexão.")),
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!normalizarChavePix(tipo, chave)) {
      setErro(`Isso não parece ${tipo === "EMAIL" ? "um e-mail" : `um ${TIPOS[tipo].toLowerCase()}`} válido.`);
      return;
    }
    salvar.mutate({ key_type: tipo, key: chave, receiver_name: nome.trim(), city: cidade.trim(), open: aberto });
  }

  return (
    <form onSubmit={enviar} className="max-w-lg space-y-6 pt-3">
      <p className="text-[14px] text-tinta-2">
        Quem apoia paga pelo banco dela, direto para a sua chave, sem taxa. Quem paga vê o nome e a chave, como em qualquer PIX: prefira a chave
        aleatória ou o e-mail ao CPF.
      </p>
      <div className="grid gap-6 sm:grid-cols-[160px_minmax(0,1fr)]">
        <Campo rotulo="Tipo de chave">
          {(id) => (
            <Seletor id={id} value={tipo} onChange={(e) => setTipo(e.target.value as TipoDeChavePix)}>
              {Object.entries(TIPOS).map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </Seletor>
          )}
        </Campo>
        <Campo rotulo="Chave" erro={erro}>
          {(id) => <Entrada id={id} required value={chave} onChange={(e) => setChave(e.target.value)} autoComplete="off" spellCheck={false} />}
        </Campo>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Campo rotulo="Nome de quem recebe" dica="Como o banco vai mostrar. Até 25 letras.">
          {(id) => <Entrada id={id} required maxLength={25} value={nome} onChange={(e) => setNome(e.target.value)} />}
        </Campo>
        <Campo rotulo="Cidade" dica="Até 15 letras.">
          {(id) => <Entrada id={id} required maxLength={15} value={cidade} onChange={(e) => setCidade(e.target.value)} />}
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" checked={aberto} onChange={(e) => setAberto(e.target.checked)} className="accent-[var(--lapis)]" />
        Aceitando apoio agora
      </label>
      <div className="flex flex-wrap gap-2">
        <Botao type="submit" variante="tinta" disabled={salvar.isPending}>
          {salvar.isPending ? "Guardando…" : "Guardar chave"}
        </Botao>
        {atual && (
          <>
            <Botao variante="texto" onClick={aoTerminar}>
              Cancelar
            </Botao>
            <Botao variante="perigo" disabled={parar.isPending} onClick={() => parar.mutate()}>
              Parar de receber
            </Botao>
          </>
        )}
      </div>
    </form>
  );
}
