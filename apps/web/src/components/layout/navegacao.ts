import { Bell, Disc3, FileMusic, FolderTree, LampDesk, Map, MessageSquare, Newspaper, Settings, Trash2, type LucideIcon } from "lucide-react";

export interface ItemDeNavegacao {
  titulo: string;
  url: string;
  icone: LucideIcon;
  exato?: boolean;
}

// Cada seção tem um ícone de traço fino (lucide), usado na navegação e na busca.
export const ESCRITA: ItemDeNavegacao[] = [
  { titulo: "Mesa", url: "/", icone: LampDesk, exato: true },
  { titulo: "Canções", url: "/songs", icone: FileMusic },
  { titulo: "Pastas", url: "/folders", icone: FolderTree },
  { titulo: "Projetos", url: "/projects", icone: Disc3 },
];

export const GENTE: ItemDeNavegacao[] = [
  { titulo: "Novidades", url: "/novidades", icone: Bell },
  { titulo: "Mural", url: "/feed", icone: Newspaper },
  { titulo: "Conversas", url: "/messages", icone: MessageSquare },
  { titulo: "Mapa", url: "/map", icone: Map },
];

export const RODAPE: ItemDeNavegacao[] = [
  { titulo: "Lixeira", url: "/trash", icone: Trash2 },
  { titulo: "Ajustes", url: "/settings", icone: Settings },
];

export const TODAS = [...ESCRITA, ...GENTE, ...RODAPE];
