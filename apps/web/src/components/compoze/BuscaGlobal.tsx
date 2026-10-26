import * as D from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { BookOpen, CircleHelp } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Estagio } from "@/components/compoze/Estagio";
import { Monograma } from "@/components/compoze/Monograma";
import { TODAS } from "@/components/layout/navegacao";
import { useAjuda } from "@/lib/ajuda";
import { useOnline } from "@/lib/rede";
import { TIPOS_DE_PROJETO } from "@/lib/rotulos";
import * as pessoasApi from "@/services/api/userService";
import { listActive } from "@/services/mock/songService";
import { useCompoze } from "@/store/compozeStore";
import type { User } from "@/types";

const grupo =
  "[&_[cmdk-group-heading]]:rotulo [&_[cmdk-group-heading]]:px-5 [&_[cmdk-group-heading]]:pt-4 [&_[cmdk-group-heading]]:pb-1.5";
const item =
  "flex cursor-pointer items-center gap-3 px-5 py-2 text-sm data-[selected=true]:bg-papel-2 data-[selected=true]:text-tinta";

/**
 * Busca em tudo o que já está carregado: canções (título, tag e letra),
 * projetos, pastas, pessoas e páginas. Não chama a API — o store já tem o
 * conjunto de trabalho da pessoa. A exceção são as pessoas: com rede, quem
 * ainda não está no store vem da busca da API (nome ou @, em todas as contas).
 */
export function BuscaGlobal({ aberta, aoMudar }: { aberta: boolean; aoMudar: (v: boolean) => void }) {
  const navegar = useNavigate();
  const musicas = listActive(useCompoze((s) => s.songs));
  const projetos = useCompoze((s) => s.projects);
  const pastas = useCompoze((s) => s.folders);
  const pessoas = useCompoze((s) => s.users);
  const euId = useCompoze((s) => s.currentUserId);
  const online = useOnline();
  const [termo, setTermo] = useState("");
  const [achados, setAchados] = useState<User[]>([]);

  // Cada abertura começa vazia, como antes de o campo ser controlado.
  useEffect(() => {
    if (!aberta) setTermo("");
  }, [aberta]);

  // Pessoas de fora do store: pergunta à API com uma pausa curta entre letras.
  useEffect(() => {
    const t = termo.trim().replace(/^@/, "");
    if (!aberta || !online || t.length < 2) {
      setAchados([]);
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
  }, [termo, aberta, online]);

  const conhecidas = pessoas.filter((u) => u.id !== euId);
  const novas = achados.filter((u) => u.id !== euId && !conhecidas.some((c) => c.id === u.id));

  const abrirAjuda = useAjuda((s) => s.abrirPainel);
  const abrirTour = useAjuda((s) => s.abrirTour);
  const ajudar = (abrir: () => void) => {
    aoMudar(false);
    abrir();
  };

  const ir = (url: string) => {
    aoMudar(false);
    navegar(url);
  };

  return (
    <D.Root open={aberta} onOpenChange={aoMudar}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-papel/70 backdrop-blur-[2px]" />
        <D.Content className="fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 border border-linha-forte bg-folha shadow-folha focus:outline-none">
          <D.Title className="sr-only">Buscar no Compoze</D.Title>
          <Command label="Buscar" loop>
            <Command.Input
              autoFocus
              value={termo}
              onValueChange={setTermo}
              placeholder="Buscar canções, versos, projetos, pessoas…"
              className="w-full border-b border-linha bg-transparent px-5 py-4 font-serif text-xl placeholder:text-tinta-3 focus:outline-none"
            />
            <Command.List className="max-h-[56vh] overflow-y-auto pb-2">
              <Command.Empty className="px-5 py-8 font-serif text-tinta-2 italic">Nada encontrado com esse termo.</Command.Empty>

              <Command.Group heading="Canções" className={grupo}>
                {musicas.map((m) => (
                  <Command.Item
                    key={m.id}
                    value={`${m.title} ${(m.tags ?? []).join(" ")} ${m.blocks.map((b) => b.text).join(" ")} ${m.id}`}
                    onSelect={() => ir(`/songs/${m.id}/edit`)}
                    className={item}
                  >
                    <span className="flex-1 truncate font-serif text-[16px]">{m.title}</span>
                    <Estagio status={m.status} semRotulo />
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Projetos" className={grupo}>
                {projetos.map((p) => (
                  <Command.Item key={p.id} value={`${p.name} ${p.id}`} onSelect={() => ir(`/projects/${p.id}`)} className={item}>
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="rotulo">{TIPOS_DE_PROJETO[p.type]}</span>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Pastas" className={grupo}>
                {pastas.map((f) => (
                  <Command.Item key={f.id} value={`pasta ${f.name} ${f.id}`} onSelect={() => ir(`/folders?pasta=${f.id}`)} className={item}>
                    <span className="flex-1 truncate">{f.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Pessoas" className={grupo}>
                {[...conhecidas, ...novas].map((u) => (
                  <Command.Item
                    key={u.id}
                    // Quem veio da API já casou lá (sem acento, parte do nome): o termo
                    // vai no value para o filtro do cmdk não esconder. No `keywords` não
                    // serve: o cmdk só relê o value quando ele muda.
                    value={`${u.name} @${u.username} ${u.id}${novas.includes(u) ? ` ${termo}` : ""}`}
                    onSelect={() => ir(`/profile/${u.username}`)}
                    className={item}
                  >
                    <Monograma usuario={u} tamanho="xs" />
                    <span className="flex-1 truncate">{u.name}</span>
                    <span className="text-[12px] text-tinta-3">@{u.username}</span>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Ir para" className={grupo}>
                {TODAS.map((p) => (
                  <Command.Item key={p.url} value={`ir ${p.titulo}`} onSelect={() => ir(p.url)} className={item}>
                    <p.icone aria-hidden className="size-4 shrink-0 text-tinta-3" strokeWidth={1.5} />
                    <span>{p.titulo}</span>
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Ajuda" className={grupo}>
                <Command.Item value="ajuda desta tela duvida" onSelect={() => ajudar(abrirAjuda)} className={item}>
                  <CircleHelp aria-hidden className="size-4 shrink-0 text-tinta-3" strokeWidth={1.5} />
                  <span>Ajuda desta tela</span>
                </Command.Item>
                <Command.Item value="ajuda primeiros passos tutorial tour" onSelect={() => ajudar(abrirTour)} className={item}>
                  <BookOpen aria-hidden className="size-4 shrink-0 text-tinta-3" strokeWidth={1.5} />
                  <span>Primeiros passos</span>
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
