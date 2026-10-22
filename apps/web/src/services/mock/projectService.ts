// Funções puras para a entidade Project — ver comentário em songService.ts
// sobre a fronteira de serviço não guardar estado próprio.
import type { Project, ProjectStyle, ProjectType } from "@/types";

const uid = () => Math.random().toString(36).slice(2, 10);

export function getById(projects: Project[], id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export interface CreateProjectInput {
  name: string;
  type: ProjectType;
  style: ProjectStyle;
  ownerId: string;
  description?: string;
  releaseDate?: string;
  fundingGoal?: number;
  estimatedCost?: number;
}

export function create(projects: Project[], input: CreateProjectInput): { projects: Project[]; newId: string } {
  const id = "p_" + uid();
  const project: Project = {
    id,
    name: input.name || "Novo projeto",
    type: input.type,
    style: input.style,
    description: input.description ?? "",
    cover:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=70",
    releaseDate: input.releaseDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
    estimatedCost: input.estimatedCost ?? 0,
    fundingGoal: input.fundingGoal ?? 0,
    fundingProgress: 0,
    status: "planejamento",
    songIds: [],
    collaboratorIds: [input.ownerId],
    ownerId: input.ownerId,
  };
  return { projects: [project, ...projects], newId: id };
}

export function addSong(projects: Project[], projectId: string, songId: string): Project[] {
  return projects.map((p) =>
    p.id === projectId ? { ...p, songIds: [...p.songIds, songId] } : p,
  );
}
