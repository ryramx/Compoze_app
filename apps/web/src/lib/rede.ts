import { useSyncExternalStore } from "react";
import { MODO_DEMO } from "@/lib/api";

function assinar(f: () => void) {
  window.addEventListener("online", f);
  window.addEventListener("offline", f);
  return () => {
    window.removeEventListener("online", f);
    window.removeEventListener("offline", f);
  };
}

/** Se há rede. Na demonstração, sempre: o servidor mora no navegador. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    assinar,
    () => MODO_DEMO || navigator.onLine,
    () => true,
  );
}

/** Explicação padrão de por que uma ação está desligada sem rede (ADR 0005). */
export const PRECISA_DE_REDE = "Precisa de internet: o servidor decide isto para todos os coautores.";
