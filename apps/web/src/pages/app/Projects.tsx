import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Cabecalho, Vazio } from "@/components/compoze/Cabecalho";
import { Capa } from "@/components/compoze/Capa";
import { NovoProjeto } from "@/components/compoze/NovoProjeto";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { FASES_DE_PROJETO, TIPOS_DE_PROJETO } from "@/lib/rotulos";
import { useCompoze } from "@/store/compozeStore";

export default function Projects() {
  const projetos = useCompoze((s) => s.projects);
  const [criando, setCriando] = useState(false);

  return (
    <Pagina>
      <Cabecalho
        secao="Escrita"
        titulo="Projetos"
        descricao="Singles, EPs e álbuns: as canções em ordem de faixa, o dinheiro e a data de lançamento."
        acoes={
          <Botao variante="tinta" onClick={() => setCriando(true)}>
            <Plus /> Novo projeto
          </Botao>
        }
      />

      <div className="mt-10">
        {projetos.length === 0 ? (
          <Vazio frase="Nenhum projeto ainda. Junte canções num single, EP ou álbum para planejar o lançamento.">
            <Botao variante="tinta" onClick={() => setCriando(true)}>
              <Plus /> Começar um projeto
            </Botao>
          </Vazio>
        ) : (
          <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {projetos.map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`} className="group block">
                  <div className="transition-transform duration-300 group-hover:-translate-y-1">
                    <Capa projeto={p} className="shadow-folha" />
                  </div>
                  <div className="mt-4 flex items-baseline justify-between gap-3">
                    <h2 className="font-serif text-[1.45rem] leading-tight group-hover:text-lapis">{p.name}</h2>
                    <span className="rotulo shrink-0">{TIPOS_DE_PROJETO[p.type]}</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-[13px] text-tinta-3">
                    <span>
                      {p.songIds.length} {p.songIds.length === 1 ? "faixa" : "faixas"} · {FASES_DE_PROJETO[p.status]}
                    </span>
                    {p.fundingGoal > 0 && <span className="numeral">{p.fundingProgress}%</span>}
                  </div>
                  {p.fundingGoal > 0 && (
                    <span className="mt-2 block h-px bg-linha">
                      <span className="block h-px bg-tinta" style={{ width: `${p.fundingProgress}%` }} />
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {criando && <NovoProjeto aberto aoMudar={setCriando} />}
    </Pagina>
  );
}
