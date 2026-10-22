import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Repetir um 401/403/404 não muda o resultado e só atrasa o feedback ao
      // usuário. Só vale insistir em falha de rede ou erro do servidor.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      // O conteúdo do Compoze é editado pelo próprio usuário; refetch a cada
      // foco de janela geraria requisição constante sem ganho.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
});
