import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ApiFeedPage, ApiPost } from "@/services/api/dto";

/** Troca uma publicação em todas as páginas de mural em cache (o meu e os de perfil) e na tela dela sozinha. */
export function trocarNoMural(qc: QueryClient, id: string, f: (p: ApiPost) => ApiPost | null) {
  qc.setQueryData<ApiPost>(["publicacao", id], (p) => (p ? (f(p) ?? undefined) : p));
  qc.setQueriesData<InfiniteData<ApiFeedPage>>({ queryKey: ["mural"] }, (dados) =>
    dados
      ? {
          ...dados,
          pages: dados.pages.map((pg) => ({
            ...pg,
            items: pg.items.flatMap((p) => {
              if (p.id !== id) return [p];
              const novo = f(p);
              return novo ? [novo] : [];
            }),
          })),
        }
      : dados,
  );
}
