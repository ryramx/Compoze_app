import type { Project, ProjectStyle, ProjectType, SongStatus } from "@/types";

/** Ordem do fluxo de uma obra. A posição é o que o marcador de estágio desenha. */
export const ESTAGIOS: { valor: SongStatus; rotulo: string; plural: string }[] = [
  { valor: "ideia", rotulo: "Ideia", plural: "Ideias" },
  { valor: "escrita", rotulo: "Escrita", plural: "Em escrita" },
  { valor: "revisao", rotulo: "Revisão", plural: "Em revisão" },
  { valor: "finalizada", rotulo: "Finalizada", plural: "Finalizadas" },
  { valor: "registrada", rotulo: "Registrada", plural: "Registradas" },
  { valor: "gravada", rotulo: "Gravada", plural: "Gravadas" },
];

export const posicaoDoEstagio = (s: SongStatus) => ESTAGIOS.findIndex((e) => e.valor === s);
export const rotuloDoEstagio = (s: SongStatus) => ESTAGIOS[posicaoDoEstagio(s)]?.rotulo ?? s;

export const TIPOS_DE_PROJETO: Record<ProjectType, string> = {
  single: "Single",
  ep: "EP",
  album: "Álbum",
};

export const ESTILOS_DE_PROJETO: Record<ProjectStyle, string> = {
  acustico: "Acústico",
  banda: "Banda",
  "ao-vivo": "Ao vivo",
};

export const FASES_DE_PROJETO: Record<Project["status"], string> = {
  planejamento: "Planejamento",
  producao: "Produção",
  mixagem: "Mixagem",
  lancado: "Lançado",
};

export const TONS = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
  "Cm", "C#m", "Dm", "D#m", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Abm", "Am", "A#m", "Bbm", "Bm",
];

export const COMPASSOS = ["2/4", "3/4", "4/4", "5/4", "6/8", "7/8", "9/8", "12/8"];

export const reais = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
