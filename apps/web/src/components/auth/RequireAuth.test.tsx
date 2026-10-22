import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Estes testes existem por causa de um bug real: depois de criar conta, o app
 * mostrava tela em branco. As telas usam `users.find(...)!` para pegar o
 * usuário atual, e o store passou a começar vazio quando migrou para a API —
 * então `me` vinha `undefined` e `me.name` derrubava a renderização.
 *
 * Typecheck, build e 69 testes passaram sem apontar nada, porque a asserção
 * `!` diz ao TypeScript exatamente aquilo que era falso.
 */

vi.mock("@/services/api/songService", () => ({
  list: vi.fn(async () => []),
  listTrash: vi.fn(async () => []),
}));
vi.mock("@/services/api/folderService", () => ({ list: vi.fn(async () => []) }));
vi.mock("@/services/api/projectService", () => ({ list: vi.fn(async () => []) }));
vi.mock("@/services/api/userService", () => ({ getMany: vi.fn(async () => []) }));
vi.mock("@/services/api/authService", () => ({
  restaurarSessao: vi.fn(async () => null),
  logout: vi.fn(),
}));

const { RequireAuth } = await import("./RequireAuth");
const { useAuth } = await import("@/store/authStore");
const { useCompoze } = await import("@/store/compozeStore");
const songApi = await import("@/services/api/songService");

const usuario = {
  id: "u1",
  name: "Ryan Filipe",
  username: "ryan",
  avatar: "",
  bio: "",
  location: { city: "", country: "", lat: 0, lng: 0 },
  followers: 0,
  following: 0,
  authorColor: 1 as const,
};

/** Tela que só funciona se o usuário já estiver carregado — como o Dashboard. */
function TelaQueExigeUsuario() {
  const me = useCompoze((s) => s.users.find((u) => u.id === s.currentUserId)!);
  return <div>Olá, {me.name.split(" ")[0]}</div>;
}

function montar() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/" element={<TelaQueExigeUsuario />} />
        </Route>
        <Route path="/login" element={<div>Tela de login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({ user: null, carregando: false });
  useCompoze.setState({
    currentUserId: "",
    users: [],
    songs: [],
    folders: [],
    projects: [],
    hidratado: false,
    carregando: false,
    erro: null,
  });
});

describe("RequireAuth", () => {
  it("manda para o login quem não tem sessão", async () => {
    montar();
    expect(await screen.findByText("Tela de login")).toBeInTheDocument();
  });

  it("não renderiza a tela antes dos dados carregarem", () => {
    // Era exatamente aqui que dava tela em branco: com sessão mas sem dados, a
    // tela renderizava e quebrava ao ler `me.name`.
    useAuth.setState({ user: usuario, carregando: false });
    vi.mocked(songApi.list).mockImplementation(() => new Promise(() => {}));

    montar();

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
    expect(screen.queryByText(/Olá/)).not.toBeInTheDocument();
  });

  it("renderiza a tela depois que os dados chegam", async () => {
    useAuth.setState({ user: usuario, carregando: false });
    useCompoze.setState({ currentUserId: "u1", users: [usuario], hidratado: true });

    montar();

    expect(await screen.findByText("Olá, Ryan")).toBeInTheDocument();
  });

  it("não redireciona enquanto a sessão está sendo restaurada", () => {
    // Quem recarrega a página não pode piscar a tela de login antes da sessão
    // voltar pelo refresh token.
    useAuth.setState({ user: null, carregando: true });

    montar();

    expect(screen.getByText(/verificando sessão/i)).toBeInTheDocument();
    expect(screen.queryByText("Tela de login")).not.toBeInTheDocument();
  });

  it("mostra erro com opção de tentar de novo quando a carga falha", async () => {
    useAuth.setState({ user: usuario, carregando: false });
    useCompoze.setState({ erro: "Não foi possível carregar seus dados." });

    montar();

    expect(await screen.findByText(/não foi possível carregar/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it("logout limpa os dados carregados", () => {
    // Sem isso, entrar com outra conta mostraria as músicas da anterior.
    useCompoze.setState({
      currentUserId: "u1",
      users: [usuario],
      songs: [{ id: "s1" } as never],
      hidratado: true,
    });

    useAuth.getState().logout();

    expect(useCompoze.getState().songs).toEqual([]);
    expect(useCompoze.getState().users).toEqual([]);
    expect(useCompoze.getState().hidratado).toBe(false);
  });
});
