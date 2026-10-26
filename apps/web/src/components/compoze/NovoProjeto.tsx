import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Botao } from "@/components/ui/Botao";
import { AreaDeTexto, Campo, Entrada } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { cn } from "@/lib/cn";
import { ESTILOS_DE_PROJETO, TIPOS_DE_PROJETO } from "@/lib/rotulos";
import { useCompoze } from "@/store/compozeStore";
import type { Project, ProjectStyle, ProjectType } from "@/types";

function Opcoes<T extends string>({ valor, opcoes, aoMudar, rotulo }: { valor: T; opcoes: Record<T, string>; aoMudar: (v: T) => void; rotulo: string }) {
  return (
    <fieldset>
      <legend className="rotulo mb-2">{rotulo}</legend>
      <div className="flex">
        {(Object.keys(opcoes) as T[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => aoMudar(k)}
            aria-pressed={valor === k}
            className={cn(
              "-ml-px flex-1 border px-3 py-2 text-sm transition-colors first:ml-0",
              valor === k ? "relative z-10 border-tinta bg-tinta text-papel" : "border-linha-forte text-tinta-2 hover:text-tinta",
            )}
          >
            {opcoes[k]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Ficha do projeto. Sem `projeto`, cria um novo; com ele, edita nome, formato,
 * descrição, data, meta e custo estimado do projeto aberto.
 */
export function NovoProjeto({ aberto, aoMudar, projeto }: { aberto: boolean; aoMudar: (v: boolean) => void; projeto?: Project }) {
  const criar = useCompoze((s) => s.createProject);
  const atualizar = useCompoze((s) => s.updateProject);
  const navegar = useNavigate();
  const [nome, setNome] = useState(projeto?.name ?? "");
  const [tipo, setTipo] = useState<ProjectType>(projeto?.type ?? "ep");
  const [estilo, setEstilo] = useState<ProjectStyle>(projeto?.style ?? "banda");
  const [descricao, setDescricao] = useState(projeto?.description ?? "");
  const [lancamento, setLancamento] = useState(projeto?.releaseDate ?? "");
  const [meta, setMeta] = useState(projeto?.fundingGoal ? String(projeto.fundingGoal) : "");
  const [custo, setCusto] = useState(projeto?.estimatedCost ? String(projeto.estimatedCost) : "");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    if (projeto) {
      // Edição vai pela fila, como a fase: funciona offline.
      atualizar(projeto.id, {
        name: nome.trim(),
        type: tipo,
        style: estilo,
        description: descricao.trim(),
        releaseDate: lancamento,
        fundingGoal: meta ? Number(meta) : 0,
        // O percentual é da tela (adapters.ts); com meta nova, refaz a conta.
        fundingProgress: meta && Number(meta) > 0 ? Math.min(100, Math.round(((projeto.fundingRaised ?? 0) / Number(meta)) * 100)) : 0,
        estimatedCost: custo ? Number(custo) : 0,
      });
      aoMudar(false);
      return;
    }
    setEnviando(true);
    try {
      const id = await criar({
        name: nome.trim(),
        type: tipo,
        style: estilo,
        description: descricao.trim() || undefined,
        releaseDate: lancamento || undefined,
        fundingGoal: meta ? Number(meta) : undefined,
        estimatedCost: custo ? Number(custo) : undefined,
      });
      aoMudar(false);
      navegar(`/projects/${id}`);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialogo
      aberto={aberto}
      aoMudar={aoMudar}
      titulo={projeto ? "Editar projeto" : "Novo projeto"}
      descricao={projeto ? "Nome, formato, data de lançamento e o dinheiro planejado." : "Um single, EP ou álbum que reúne canções do seu caderno."}
      largura="lg"
    >
      <form onSubmit={enviar} className="space-y-6">
        <Campo rotulo="Nome do projeto">{(id) => <Entrada id={id} autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Madrugada" className="font-serif text-xl" />}</Campo>
        <div className="grid gap-6 sm:grid-cols-2">
          <Opcoes rotulo="Formato" valor={tipo} opcoes={TIPOS_DE_PROJETO} aoMudar={setTipo} />
          <Opcoes rotulo="Estilo" valor={estilo} opcoes={ESTILOS_DE_PROJETO} aoMudar={setEstilo} />
        </div>
        <Campo rotulo="Sobre">{(id) => <AreaDeTexto id={id} rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que une essas canções?" />}</Campo>
        <div className="grid gap-6 sm:grid-cols-3">
          <Campo rotulo="Lançamento">{(id) => <Entrada id={id} type="date" value={lancamento} onChange={(e) => setLancamento(e.target.value)} />}</Campo>
          <Campo rotulo="Meta (R$)">{(id) => <Entrada id={id} type="number" min={0} inputMode="numeric" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="0" className="numeral" />}</Campo>
          <Campo rotulo="Custo estimado (R$)">{(id) => <Entrada id={id} type="number" min={0} inputMode="numeric" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0" className="numeral" />}</Campo>
        </div>
        <div className="flex justify-end gap-2 border-t border-linha pt-5">
          <Botao variante="texto" onClick={() => aoMudar(false)}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="tinta" disabled={!nome.trim() || enviando}>
            {projeto ? "Salvar" : enviando ? "Criando…" : "Criar projeto"}
          </Botao>
        </div>
      </form>
    </Dialogo>
  );
}
