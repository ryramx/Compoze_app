import { ArrowRight, Plus } from "lucide-react";
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
          // Grade de duas colunas já no celular: a capa inteira na largura da
          // tela empurrava o segundo projeto para fora da vista.
          <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
            {projetos.map((p) => (
              <li key={p.id} className="min-w-0">
                <Link to={`/projects/${p.id}`} className="group block" aria-label={`Abrir ${p.name}`}>
                  <div className="transition-transform duration-300 group-hover:-translate-y-1">
                    <Capa projeto={p} className="shadow-folha" />
                  </div>
                  <div className="mt-3 sm:mt-4">
                    <span className="rotulo">{TIPOS_DE_PROJETO[p.type]}</span>
                    <h2 className="mt-0.5 line-clamp-2 font-serif text-[1.15rem] leading-tight group-hover:text-lapis sm:text-[1.4rem]">{p.name}</h2>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-2 text-[12px] text-tinta-3 sm:text-[13px]">
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
                  <span className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] text-tinta-2 transition-colors group-hover:text-lapis">
                    Abrir e editar <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
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
