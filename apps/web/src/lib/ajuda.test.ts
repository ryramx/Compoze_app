import { beforeEach, describe, expect, it } from "vitest";
import {
  jaViuPrimeirosPassos,
  marcarPrimeirosPassos,
  ROTAS_SEM_TOUR,
  TELAS_DO_MENU,
  TOPICOS,
  topico,
  topicoDaRota,
  useAjuda,
} from "./ajuda";

describe("topicoDaRota", () => {
  it.each([
    ["/", "mesa"],
    ["/songs", "cancoes"],
    ["/songs?estagio=ideia", "cancoes"],
    ["/songs/0199-abc/edit", "editor"],
    ["/folders", "pastas"],
    ["/projects", "projetos"],
    ["/projects/0199-abc", "projeto"],
    ["/feed", "mural"],
    ["/messages", "conversas"],
    ["/messages/0199-abc", "conversas"],
    ["/map", "mapa"],
    ["/profile", "perfil"],
    ["/profile/maya", "perfil"],
    ["/profile/maya/seguidores", "seguidores"],
    ["/profile/maya/seguindo", "seguidores"],
    ["/trash", "lixeira"],
    ["/settings", "ajustes"],
    ["/convite/tok", "convite"],
    ["/apoiar/0199-abc", "apoiar"],
    ["/compartilhar", "compartilhar"],
  ])("%s → %s", (caminho, id) => {
    expect(topicoDaRota(caminho).id).toBe(id);
  });

  it("cai na Mesa quando a rota não tem ajuda própria", () => {
    expect(topicoDaRota("/nada-aqui").id).toBe("mesa");
    expect(topico("inexistente").id).toBe("mesa");
  });
});

describe("tópicos", () => {
  it("toda tela do menu tem ajuda, e cada tópico tem o que dizer", () => {
    const ids = new Set(TOPICOS.map((t) => t.id));
    expect(ids.size).toBe(TOPICOS.length);
    for (const id of TELAS_DO_MENU) expect(ids.has(id)).toBe(true);
    for (const t of TOPICOS) {
      expect(t.resumo.length).toBeGreaterThan(0);
      expect(t.itens.length).toBeGreaterThan(0);
    }
  });
});

describe("primeiros passos", () => {
  beforeEach(() => localStorage.clear());

  it("lembra por conta, neste aparelho", () => {
    expect(jaViuPrimeirosPassos("u1")).toBe(false);
    marcarPrimeirosPassos("u1");
    expect(jaViuPrimeirosPassos("u1")).toBe(true);
    expect(jaViuPrimeirosPassos("u2")).toBe(false);
  });

  it("não abre sozinho em link de convite, apoio ou compartilhamento", () => {
    expect(ROTAS_SEM_TOUR.test("/convite/abc")).toBe(true);
    expect(ROTAS_SEM_TOUR.test("/apoiar/abc")).toBe(true);
    expect(ROTAS_SEM_TOUR.test("/compartilhar")).toBe(true);
    expect(ROTAS_SEM_TOUR.test("/")).toBe(false);
    expect(ROTAS_SEM_TOUR.test("/songs")).toBe(false);
  });

  it("tour e painel não ficam abertos ao mesmo tempo", () => {
    useAjuda.getState().abrirPainel();
    useAjuda.getState().abrirTour();
    expect(useAjuda.getState()).toMatchObject({ tour: true, painel: false });
    useAjuda.getState().abrirPainel();
    expect(useAjuda.getState()).toMatchObject({ tour: false, painel: true });
    useAjuda.getState().fechar();
    expect(useAjuda.getState()).toMatchObject({ tour: false, painel: false });
  });
});
