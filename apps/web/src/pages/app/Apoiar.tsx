import type { Apoio, ApoioComPix } from "@compoze/contracts/apoios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy } from "lucide-react";
import { toString as qrSvg } from "qrcode";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { Monograma } from "@/components/compoze/Monograma";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { Campo, Entrada } from "@/components/ui/Campo";
import { ApiError, MODO_DEMO } from "@/lib/api";
import { enderecoDaImagem } from "@/lib/imagens";
import { reais } from "@/lib/rotulos";
import * as apoios from "@/services/api/apoioService";
import { usuarioDaApi } from "@/services/api/adapters";

const SUGESTOES = [10, 25, 50, 100];

const STATUS: Record<Apoio["status"], string> = {
  PENDENTE: "esperando a confirmação",
  CONFIRMADO: "chegou",
  RECUSADO: "não chegou",
};

/**
 * Apoiar um projeto por PIX (Fase 4d, ADR 0018). Quem apoia escolhe o valor,
 * paga pelo app do banco com o QR Code ou o copia e cola e avisa que pagou.
 * O dinheiro vai direto para quem fez o projeto.
 */
export default function Apoiar() {
  const { id = "" } = useParams();
  const cliente = useQueryClient();
  const { data: projeto, error, isPending } = useQuery({ queryKey: ["apoiar", id], queryFn: () => apoios.paraApoiar(id), retry: false, enabled: !MODO_DEMO });
  const { data: meus = [] } = useQuery({ queryKey: ["apoiar", id, "meus"], queryFn: () => apoios.meus(id), enabled: !!projeto });
  const [valor, setValor] = useState("25");
  const [gerado, setGerado] = useState<ApoioComPix | null>(null);
  const [qr, setQr] = useState("");

  useEffect(() => {
    if (!gerado) return;
    void qrSvg(gerado.pix_code, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1c1b18", light: "#ffffff" } }).then(setQr);
  }, [gerado]);

  const gerar = useMutation({
    mutationFn: (v: number) => apoios.apoiar(id, v),
    onSuccess: setGerado,
    onError: (e) => toast.error(e instanceof ApiError && e.status !== 0 ? e.message : "Sem conexão. O PIX é gerado com internet."),
  });
  const paguei = useMutation({
    mutationFn: (apoioId: string) => apoios.avisarPago(id, apoioId),
    onSuccess: async () => {
      setGerado(null);
      await cliente.invalidateQueries({ queryKey: ["apoiar", id, "meus"] });
      toast("Avisado. Quando o dinheiro aparecer na conta, a confirmação chega para você.");
    },
    onError: () => toast.error("Sem conexão. Tente avisar de novo em instantes."),
  });

  if (MODO_DEMO || error) {
    return (
      <Pagina estreita>
        <p className="font-serif text-xl text-tinta-2 italic">
          {MODO_DEMO ? "O apoio por PIX não funciona na demonstração." : "Este projeto não está recebendo apoio agora."}
        </p>
        <Link to="/" className="link-sublinhado mt-4 inline-block text-sm">
          Voltar para a Mesa
        </Link>
      </Pagina>
    );
  }
  if (isPending || !projeto) return <Pagina estreita>{null}</Pagina>;

  const dona = usuarioDaApi(projeto.owner);
  const meta = projeto.funding_target ?? 0;
  const porcento = meta > 0 ? Math.min(100, Math.round((projeto.funding_current / meta) * 100)) : 0;
  const numero = Number(valor.replace(",", "."));
  const valido = Number.isInteger(numero) && numero >= 1 && numero <= 100_000;

  return (
    <Pagina estreita>
      <Link to={`/profile/${dona.username}`} className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-tinta-2 hover:text-tinta">
        <ArrowLeft className="size-4" /> {dona.name}
      </Link>

      <div className="flex items-start gap-5">
        {projeto.cover_url ? (
          <img src={enderecoDaImagem(projeto.cover_url)} alt="" className="size-24 shrink-0 object-cover shadow-folha" />
        ) : (
          <Monograma usuario={dona} tamanho="lg" />
        )}
        <div className="min-w-0">
          <p className="rotulo text-lapis">Apoiar</p>
          <h1 className="titulo-pagina mt-1">{projeto.name}</h1>
          {projeto.description && <p className="mt-3 font-serif text-[1.15rem] leading-snug text-tinta-2">{projeto.description}</p>}
        </div>
      </div>

      <div className="mt-8">
        <p className="text-[14px] text-tinta-2">
          <span className="numeral text-tinta">{reais(projeto.funding_current)}</span>
          {meta > 0 && <> de {reais(meta)}</>} · {projeto.supporters} {projeto.supporters === 1 ? "pessoa apoiou" : "pessoas apoiaram"}
        </p>
        {meta > 0 && (
          <span className="mt-2 block h-[3px] bg-linha">
            <span className="block h-[3px] bg-lapis" style={{ width: `${porcento}%` }} />
          </span>
        )}
      </div>

      {gerado ? (
        <section className="mt-10 border-t border-linha pt-8">
          <p className="text-[14px] text-tinta-2">
            Pague <span className="numeral text-tinta">{reais(gerado.contribution.amount)}</span> para{" "}
            <span className="text-tinta">{projeto.receiver_name}</span> no app do seu banco: aponte a câmera para o código ou use o copia e cola.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-[220px_minmax(0,1fr)]">
            <div className="aspect-square w-[220px] bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR Code do PIX" role="img" />
            <div className="min-w-0 space-y-4">
              <p className="rotulo">PIX copia e cola</p>
              <p className="font-mono text-[11.5px] leading-relaxed break-all text-tinta-2">{gerado.pix_code}</p>
              <Botao
                onClick={() =>
                  void navigator.clipboard.writeText(gerado.pix_code).then(
                    () => toast("Copiado. Cole no app do banco, em PIX → Copia e cola."),
                    () => toast.error("Não deu para copiar; selecione o código e copie."),
                  )
                }
              >
                <Copy /> Copiar código
              </Botao>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            <Botao variante="tinta" disabled={paguei.isPending} onClick={() => paguei.mutate(gerado.contribution.id)}>
              Já paguei
            </Botao>
            <Botao variante="texto" onClick={() => setGerado(null)}>
              Trocar o valor
            </Botao>
          </div>
        </section>
      ) : (
        <section className="mt-10 max-w-sm border-t border-linha pt-8">
          <div className="mb-4 flex flex-wrap gap-2">
            {SUGESTOES.map((v) => (
              <Botao key={v} tamanho="sm" variante={valor === String(v) ? "tinta" : "contorno"} onClick={() => setValor(String(v))}>
                {reais(v)}
              </Botao>
            ))}
          </div>
          <Campo rotulo="Valor em reais" erro={valor && !valido ? "Um valor inteiro, de R$ 1 a R$ 100.000." : null}>
            {(campo) => <Entrada id={campo} inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d]/g, ""))} />}
          </Campo>
          <Botao variante="tinta" className="mt-6" disabled={!valido || gerar.isPending} onClick={() => gerar.mutate(numero)}>
            {gerar.isPending ? "Gerando…" : "Gerar PIX"}
          </Botao>
          <p className="mt-4 text-[12.5px] text-tinta-3">
            O dinheiro vai direto para a conta de {projeto.receiver_name}, sem passar pelo Compoze e sem taxa.
          </p>
        </section>
      )}

      {meus.length > 0 && (
        <section className="mt-12">
          <p className="rotulo mb-3">Seus apoios a este projeto</p>
          <ul className="space-y-1.5 text-[13.5px] text-tinta-2">
            {meus
              .filter((a) => a.status !== "PENDENTE" || a.paid_claimed_at)
              .map((a) => (
                <li key={a.id}>
                  <span className="numeral text-tinta">{reais(a.amount)}</span> · {STATUS[a.status]}
                </li>
              ))}
          </ul>
        </section>
      )}
    </Pagina>
  );
}
