import { Link, useParams } from "react-router";
import { TituloDeSecao, Vazio } from "@/components/compoze/Cabecalho";
import { Estagio } from "@/components/compoze/Estagio";
import { Monograma } from "@/components/compoze/Monograma";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { quando } from "@/lib/datas";
import { listActive } from "@/services/mock/songService";
import { useCompoze } from "@/store/compozeStore";

export default function Profile() {
  const { username } = useParams();
  const pessoas = useCompoze((s) => s.users);
  const euId = useCompoze((s) => s.currentUserId);
  const musicas = listActive(useCompoze((s) => s.songs));
  const seguindo = useCompoze((s) => s.followingIds);
  const seguir = useCompoze((s) => s.toggleFollow);
  const getUser = useCompoze((s) => s.getUser);

  const pessoa = username ? pessoas.find((u) => u.username === username) : pessoas.find((u) => u.id === euId);

  if (!pessoa) {
    return (
      <Pagina estreita>
        <p className="font-serif text-xl text-tinta-2 italic">Ninguém com esse nome por aqui.</p>
      </Pagina>
    );
  }

  const souEu = pessoa.id === euId;
  // No próprio perfil: tudo de que participo. No de outra pessoa: só o que ela
  // deixou visível e que eu consigo ver (as obras em comum).
  const obras = musicas.filter((m) => m.collaborators.some((c) => c.userId === pessoa.id) && (souEu || !m.hidden));
  const parcerias = [...new Set(obras.flatMap((m) => m.collaborators.map((c) => c.userId)))].filter((id) => id !== pessoa.id);
  const sigo = seguindo.includes(pessoa.id);

  return (
    <Pagina>
      <header className="grid animate-[entrar_.35s_ease-out] gap-8 border-b border-linha pb-10 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-end">
        <Monograma usuario={pessoa} tamanho="xl" />
        <div>
          <div className="rotulo mb-3">
            @{pessoa.username}
            {pessoa.location.city && ` · ${pessoa.location.city}${pessoa.location.country ? `, ${pessoa.location.country}` : ""}`}
          </div>
          <h1 className="titulo-pagina">{pessoa.name}</h1>
          {pessoa.bio && <p className="mt-4 max-w-xl font-serif text-[1.25rem] leading-snug text-tinta-2">{pessoa.bio}</p>}
        </div>
        <div className="flex gap-2">
          {souEu ? (
            <Link to="/settings">
              <Botao>Editar perfil</Botao>
            </Link>
          ) : (
            <>
              <Botao variante={sigo ? "contorno" : "tinta"} onClick={() => seguir(pessoa.id)}>
                {sigo ? "Seguindo" : "Seguir"}
              </Botao>
              <Link to="/messages">
                <Botao variante="texto">Conversar</Botao>
              </Link>
            </>
          )}
        </div>
      </header>

      <dl className="grid grid-cols-3 border-b border-linha">
        {[
          { rotulo: "Obras", valor: obras.length },
          { rotulo: "Parcerias", valor: parcerias.length },
          { rotulo: "Seguidores", valor: pessoa.followers },
        ].map((d) => (
          <div key={d.rotulo} className="border-r border-linha py-5 pl-1 last:border-r-0 sm:pl-0">
            <dt className="rotulo">{d.rotulo}</dt>
            <dd className="numeral mt-1 text-[1.6rem]">{d.valor}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section>
          <TituloDeSecao>{souEu ? "Suas obras" : "Obras"}</TituloDeSecao>
          {obras.length === 0 ? (
            <Vazio frase={souEu ? "Você ainda não tem obras." : "Nenhuma obra visível."} />
          ) : (
            <ul className="-mt-3">
              {obras.map((m) => (
                <li key={m.id}>
                  <Link to={`/songs/${m.id}/edit`} className="group flex items-center gap-4 border-b border-linha py-3.5">
                    <span className="min-w-0 flex-1 truncate font-serif text-[1.15rem] group-hover:text-lapis">{m.title}</span>
                    <Estagio status={m.status} semRotulo />
                    <span className="w-20 text-right text-[12.5px] text-tinta-3">{quando(m.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside>
          <TituloDeSecao>Escreve com</TituloDeSecao>
          {parcerias.length === 0 ? (
            <p className="font-serif text-tinta-3 italic">Ninguém ainda.</p>
          ) : (
            <ul className="space-y-3">
              {parcerias.map((id) => {
                const u = getUser(id);
                return (
                  <li key={id}>
                    <Link to={`/profile/${u?.username}`} className="flex items-center gap-3 text-[14px] hover:text-lapis">
                      <Monograma usuario={u} tamanho="sm" />
                      <span>
                        {u?.name}
                        <span className="block text-[12px] text-tinta-3">{obras.filter((m) => m.collaborators.some((c) => c.userId === id)).length} em comum</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </Pagina>
  );
}
