import { Archive, BookOpen, Disc3, FolderTree, Home, Map, MessageSquare, Newspaper, Settings, type LucideIcon } from "lucide-react";

export interface ItemDeNavegacao {
  indice: string;
  titulo: string;
  url: string;
  icone: LucideIcon;
  exato?: boolean;
}

// O índice numerado é o sumário do caderno: aparece na navegação e no
// cabeçalho de cada página, para a pessoa sempre saber em que "capítulo" está.
export const ESCRITA: ItemDeNavegacao[] = [
  { indice: "01", titulo: "Mesa", url: "/", icone: Home, exato: true },
  { indice: "02", titulo: "Canções", url: "/songs", icone: BookOpen },
  { indice: "03", titulo: "Pastas", url: "/folders", icone: FolderTree },
  { indice: "04", titulo: "Projetos", url: "/projects", icone: Disc3 },
];

export const GENTE: ItemDeNavegacao[] = [
  { indice: "05", titulo: "Mural", url: "/feed", icone: Newspaper },
  { indice: "06", titulo: "Conversas", url: "/messages", icone: MessageSquare },
  { indice: "07", titulo: "Mapa", url: "/map", icone: Map },
];

export const RODAPE: ItemDeNavegacao[] = [
  { indice: "08", titulo: "Lixeira", url: "/trash", icone: Archive },
  { indice: "09", titulo: "Ajustes", url: "/settings", icone: Settings },
];

export const TODAS = [...ESCRITA, ...GENTE, ...RODAPE];
