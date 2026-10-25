export type ProjectType = "single" | "ep" | "album";
export type ProjectStyle = "acustico" | "banda" | "ao-vivo";

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  style: ProjectStyle;
  description: string;
  cover: string;
  releaseDate: string;
  estimatedCost: number;
  fundingGoal: number;
  fundingProgress: number; // 0..100
  /** Valor arrecadado em reais, quando a API diz (o percentual é arredondado). */
  fundingRaised?: number;
  status: "planejamento" | "producao" | "mixagem" | "lancado";
  songIds: string[];
  collaboratorIds: string[];
  ownerId: string;
}
