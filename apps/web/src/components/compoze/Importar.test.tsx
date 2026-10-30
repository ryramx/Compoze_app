import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Importar } from "@/components/compoze/Importar";

const pagina = (titulo: string, verso: string) =>
  new File([`<html><body><h1>${titulo}</h1><h2>Refrão</h2><pre><b>G     D</b>\n${verso}</pre></body></html>`], `${titulo}.html`, {
    type: "text/html",
  });

describe("Importar vários arquivos", () => {
  it("cada arquivo vira uma canção; o que não é letra fica de fora", async () => {
    const aoCriarVarias = vi.fn();
    render(<Importar aberto aoMudar={() => undefined} destino={{ tipo: "nova", aoCriar: vi.fn(), aoCriarVarias }} />);

    const entrada = document.querySelector<HTMLInputElement>("input[type=file]")!;
    expect(entrada.multiple).toBe(true);
    fireEvent.change(entrada, {
      target: { files: [pagina("Rua", "Vou sem pressa"), pagina("Madrugada", "Café esfriou"), new File(["x"], "foto.png", { type: "image/png" })] },
    });

    await screen.findByText("Importar 3 arquivos");
    await waitFor(() => expect(screen.getByRole("button", { name: "Criar 2 canções" })).toBeEnabled());
    expect(screen.getByText(/não é de letra/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Criar 2 canções" }));
    await waitFor(() => expect(aoCriarVarias).toHaveBeenCalledTimes(1));
    const criadas = aoCriarVarias.mock.calls[0]![0] as { titulo: string; blocos: { type: string; text: string }[] }[];
    expect(criadas.map((c) => c.titulo)).toEqual(["Rua", "Madrugada"]);
    expect(criadas[0]!.blocos.map((b) => b.type)).toEqual(["section", "chord-line", "lyric-line"]);
  });

  it("desmarcar tira a canção do lote", async () => {
    const aoCriarVarias = vi.fn();
    render(<Importar aberto aoMudar={() => undefined} destino={{ tipo: "nova", aoCriar: vi.fn(), aoCriarVarias }} />);
    fireEvent.change(document.querySelector("input[type=file]")!, { target: { files: [pagina("Rua", "a"), pagina("Lua", "b")] } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Criar 2 canções" })).toBeEnabled());
    fireEvent.click(screen.getByRole("checkbox", { name: "Importar Lua" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar 1 canção" }));
    await waitFor(() => expect(aoCriarVarias).toHaveBeenCalled());
    expect((aoCriarVarias.mock.calls[0]![0] as { titulo: string }[]).map((c) => c.titulo)).toEqual(["Rua"]);
  });

  it("no editor, um arquivo só", () => {
    render(<Importar aberto aoMudar={() => undefined} destino={{ tipo: "cancao", folhaVazia: true, aoAplicar: vi.fn() }} />);
    expect(document.querySelector<HTMLInputElement>("input[type=file]")!.multiple).toBe(false);
  });
});
