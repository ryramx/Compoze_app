import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { PrimeirosPassos } from "./PrimeirosPassos";
import { jaViuPrimeirosPassos, useAjuda } from "@/lib/ajuda";
import { useAuth } from "@/store/authStore";
import type { User } from "@/types";

function abrir() {
  render(
    <MemoryRouter>
      <PrimeirosPassos />
    </MemoryRouter>,
  );
  act(() => useAjuda.getState().abrirTour());
}

describe("PrimeirosPassos", () => {
  beforeEach(() => {
    localStorage.clear();
    useAjuda.getState().fechar();
    useAuth.setState({ user: { id: "u1", name: "Lara Mendes", username: "lara" } as User, carregando: false });
  });

  it("passa as folhas e marca como visto ao terminar", () => {
    abrir();
    expect(screen.getByText("Um caderno para compor junto.")).toBeInTheDocument();
    // Na primeira folha, Voltar fica invisível (e fora da árvore acessível).
    expect(screen.queryByRole("button", { name: /Voltar/ })).toBeNull();

    for (let n = 0; n < 6; n++) fireEvent.click(screen.getByRole("button", { name: /Próxima/ }));
    expect(screen.getByText("Dúvida em alguma tela? Toque em Ajuda.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pular" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    expect(useAjuda.getState().tour).toBe(false);
    expect(jaViuPrimeirosPassos("u1")).toBe(true);
  });

  it("Pular também conta como visto", () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Pular" }));
    expect(useAjuda.getState().tour).toBe(false);
    expect(jaViuPrimeirosPassos("u1")).toBe(true);
  });

  it("anda com as setas do teclado", () => {
    abrir();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(screen.getByText("A canção se escreve em blocos.")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    expect(screen.getByText("Um caderno para compor junto.")).toBeInTheDocument();
  });
});
