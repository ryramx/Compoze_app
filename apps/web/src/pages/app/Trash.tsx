import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Cabecalho, Vazio } from "@/components/compoze/Cabecalho";
import { Confirmar } from "@/components/compoze/Confirmar";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { quando } from "@/lib/datas";
import { daysRemaining, listTrashed, TRASH_RETENTION_DAYS } from "@/services/mock/songService";
import { useCompoze } from "@/store/compozeStore";
import type { Song } from "@/types";

export default function Trash() {
  const todas = useCompoze((s) => s.songs);
  const restaurar = useCompoze((s) => s.restoreSong);
  const apagar = useCompoze((s) => s.permanentlyDeleteSong);
  const reler = useCompoze((s) => s.purgeExpiredTrash);
  const [apagando, setApagando] = useState<Song | null>(null);

  // O expurgo é do servidor (RN08); ao abrir, relemos para refletir o que já saiu.
  useEffect(() => reler(), [reler]);

  const itens = [...listTrashed(todas)].sort((a, b) => daysRemaining(a) - daysRemaining(b));

  return (
    <Pagina>
      <Cabecalho
        titulo="Lixeira"
        descricao={`O que você exclui fica aqui por ${TRASH_RETENTION_DAYS} dias, no lugar onde estava. Depois disso é apagado de vez.`}
      />

      <div className="mt-8">
        {itens.length === 0 ? (
          <Vazio frase="Lixeira vazia. Nada se perdeu." />
        ) : (
          <ul className="border-t border-linha">
            {itens.map((m) => {
              const dias = Math.max(0, daysRemaining(m));
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-linha py-4">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-serif text-[1.2rem] text-tinta-2 line-through decoration-linha-forte decoration-1">{m.title}</div>
                    <div className="text-[12.5px] text-tinta-3">excluída {m.deletedAt ? quando(m.deletedAt) : ""}</div>
                  </div>
                  <div className="w-36 text-[13px]">
                    <span className={dias <= 5 ? "text-lapis" : "text-tinta-2"}>
                      {dias === 0 ? "sai hoje" : `restam ${dias} ${dias === 1 ? "dia" : "dias"}`}
                    </span>
                    <span className="mt-1 block h-px bg-linha">
                      <span className="block h-px bg-tinta-2" style={{ width: `${(dias / TRASH_RETENTION_DAYS) * 100}%` }} />
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Botao
                      tamanho="sm"
                      onClick={() => {
                        restaurar(m.id);
                        toast(`“${m.title}” voltou para o caderno.`);
                      }}
                    >
                      Restaurar
                    </Botao>
                    <Botao tamanho="sm" variante="perigo" onClick={() => setApagando(m)}>
                      Apagar de vez
                    </Botao>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Confirmar
        aberto={!!apagando}
        aoMudar={(v) => !v && setApagando(null)}
        titulo="Apagar de vez?"
        descricao={`“${apagando?.title}” e tudo o que foi escrito nela serão apagados. Isso não tem volta.`}
        acao="Apagar de vez"
        aoConfirmar={() => apagando && apagar(apagando.id)}
      />
    </Pagina>
  );
}
