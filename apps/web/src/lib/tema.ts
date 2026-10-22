import { useSyncExternalStore } from "react";

export type Tema = "claro" | "escuro" | "sistema";

const CHAVE = "compoze.tema";
const ouvintes = new Set<() => void>();
const midia = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function ler(): Tema {
  try {
    const t = localStorage.getItem(CHAVE);
    if (t === "claro" || t === "escuro" || t === "sistema") return t;
  } catch {
    // Sem storage: segue o sistema.
  }
  return "sistema";
}

function aplicar(tema: Tema) {
  const escuro = tema === "escuro" || (tema === "sistema" && !!midia?.matches);
  document.documentElement.classList.toggle("dark", escuro);
}

export function definirTema(tema: Tema) {
  try {
    localStorage.setItem(CHAVE, tema);
  } catch {
    // Vale só nesta aba.
  }
  aplicar(tema);
  ouvintes.forEach((f) => f());
}

/** Chamado uma vez em main.tsx, antes do primeiro render, para não piscar. */
export function iniciarTema() {
  aplicar(ler());
  midia?.addEventListener?.("change", () => {
    if (ler() === "sistema") aplicar("sistema");
    ouvintes.forEach((f) => f());
  });
}

export function useTema(): [Tema, boolean] {
  const tema = useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    ler,
    () => "sistema" as Tema,
  );
  const escuro = tema === "escuro" || (tema === "sistema" && !!midia?.matches);
  return [tema, escuro];
}
