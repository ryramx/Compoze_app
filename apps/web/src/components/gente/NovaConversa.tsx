import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Monograma } from "@/components/compoze/Monograma";
import { useConversas } from "@/components/gente/conversas";
import { Dialogo } from "@/components/ui/Dialogo";
import { useOnline } from "@/lib/rede";
import { usuarioDaApi } from "@/services/api/adapters";
import * as gente from "@/services/api/genteService";
import * as pessoasApi from "@/services/api/userService";
import { useCompoze } from "@/store/compozeStore";
import type { User } from "@/types";

/**
 * Escolher com quem conversar: busca por nome ou @ em todas as contas e, com o
 * campo vazio, quem a pessoa segue. Escolher leva a `/messages?com=<id>`, que
 * abre a conversa que já existe ou cria uma.
 */
export function NovaConversa({ aberta, aoMudar }: { aberta: boolean; aoMudar: (v: boolean) => void }) {
  const navegar = useNavigate();
  const online = useOnline();
  const eu = useCompoze((s) => s.currentUserId);
  const { data: lista } = useConversas();
  const [termo, setTermo] = useState("");
  const [achados, setAchados] = useState<User[] | null>(null);

  const sigo = useQuery({
    queryKey: ["seguindo", eu],
    queryFn: () => gente.seguindo(eu!),
    enabled: aberta && online && !!eu,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!aberta) setTermo("");
  }, [aberta]);

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

  const conversando = new Set(lista?.map((c) => c.other.id));
  const pessoas = (achados ?? sigo.data?.map(usuarioDaApi) ?? []).filter((u) => u.id !== eu);

  const escolher = (u: User) => {
    aoMudar(false);
    navegar(`/messages?com=${u.id}`);
  };

  return (
    <Dialogo aberto={aberta} aoMudar={aoMudar} titulo="Nova conversa" descricao="Procure a pessoa pelo nome ou pelo @.">
      {!online ? (
        <p className="py-6 font-serif text-tinta-2 italic">Conversas precisam de internet.</p>
      ) : (
        <>
          <input
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Nome ou @usuário"
            aria-label="Buscar pessoa por nome ou @usuário"
            className="mb-1 w-full border-b border-linha-forte bg-transparent py-2 focus:border-tinta focus:outline-none"
          />
          {!achados && pessoas.length > 0 && <h3 className="rotulo mt-4 text-tinta-2">Quem você segue</h3>}
          {!achados && pessoas.length === 0 && !sigo.isPending && (
            <p className="py-5 font-serif text-tinta-3 italic">Escreva um nome ou @ para procurar.</p>
          )}
          {achados && pessoas.length === 0 ? (
            <p className="py-5 font-serif text-tinta-2 italic">Ninguém com esse nome ou @ no Compoze.</p>
          ) : (
            <ul className="divide-y divide-linha">
              {pessoas.map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => escolher(u)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-papel-2/50">
                    <Monograma usuario={u} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{u.name}</span>
                      <span className="block truncate text-[12.5px] text-tinta-3">@{u.username}</span>
                    </span>
                    {conversando.has(u.id) && <span className="shrink-0 text-[12.5px] text-tinta-3">já conversam</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Dialogo>
  );
}
