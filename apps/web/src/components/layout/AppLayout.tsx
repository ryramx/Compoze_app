import { CloudOff, Menu as IconeMenu, Moon, RefreshCw, Search, Sun, X } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { BuscaGlobal } from "@/components/compoze/BuscaGlobal";
import { Marca } from "@/components/compoze/Marca";
import { Monograma } from "@/components/compoze/Monograma";
import { AoVivo } from "@/components/gente/AoVivo";
import { useNaoLidas } from "@/components/gente/conversas";
import { ESCRITA, GENTE, RODAPE, type ItemDeNavegacao } from "@/components/layout/navegacao";
import { MODO_DEMO } from "@/lib/api";
import { cn } from "@/lib/cn";
import { quandoRecusar, usePendentes } from "@/lib/fila";
import { ligarAvisos, ligarAvisosAoAbrir, ouvirToqueNoAviso, renovarAvisos } from "@/lib/avisos";
import { pedirArmazenamentoPersistente } from "@/lib/pwa";
import { useOnline } from "@/lib/rede";
import { definirTema, useTema } from "@/lib/tema";
import { useCompoze } from "@/store/compozeStore";

function ItemDoTrilho({ item, aoClicar, contador = 0 }: { item: ItemDeNavegacao; aoClicar?: () => void; contador?: number }) {
  return (
    <NavLink
      to={item.url}
      end={item.exato}
      onClick={aoClicar}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 py-[7px] pr-3 pl-5 text-[14px] transition-colors",
          isActive ? "text-tinta" : "text-tinta-2 hover:text-tinta",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 bg-lapis transition-opacity",
              isActive ? "opacity-100" : "opacity-0",
            )}
          />
          <item.icone aria-hidden className={cn("size-4 shrink-0", isActive ? "text-lapis" : "text-tinta-3")} strokeWidth={1.5} />
          <span className={cn(isActive && "font-medium")}>{item.titulo}</span>
          {contador > 0 && (
            <span className="numeral ml-auto bg-lapis px-1.5 text-[10.5px] leading-[1.15rem] text-papel" aria-label={`${contador} não lidas`}>
              {contador}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

/**
 * Estado da sincronização, no pé do trilho: some quando está tudo no servidor.
 * Offline não é erro — o caderno segue funcionando —, então é discreto.
 */
function EstadoDaRede() {
  const online = useOnline();
  const pendentes = usePendentes();
  // A tela já mostra a cópia do aparelho, mas a leitura do servidor ainda não
  // voltou: no Render grátis, é a API acordando (até um minuto). Só aparece se
  // demorar, para não piscar a cada abertura.
  const lendo = useCompoze((s) => s.carregando && s.hidratado);
  const [demorando, setDemorando] = useState(false);
  useEffect(() => {
    if (!lendo) {
      setDemorando(false);
      return;
    }
    const t = setTimeout(() => setDemorando(true), 3000);
    return () => clearTimeout(t);
  }, [lendo]);

  if (online && demorando && pendentes === 0) {
    return (
      <p className="mb-3 flex items-start gap-2 text-[11.5px] leading-snug text-tinta-3" role="status">
        <RefreshCw className="mt-px size-3 shrink-0 animate-spin [animation-duration:2s]" aria-hidden />
        <span>Conectando ao servidor. Pode escrever: o que mudar sobe em seguida.</span>
      </p>
    );
  }
  if (online && pendentes === 0) return null;
  const mudancas = pendentes === 1 ? "1 mudança" : `${pendentes} mudanças`;
  return (
    <p className="mb-3 flex items-start gap-2 text-[11.5px] leading-snug text-tinta-3" role="status">
      {online ? (
        <>
          <RefreshCw className="mt-px size-3 shrink-0 animate-spin [animation-duration:2s]" aria-hidden />
          Enviando {mudancas}…
        </>
      ) : (
        <>
          <CloudOff className="mt-px size-3 shrink-0" aria-hidden />
          <span>
            Sem internet. {pendentes > 0 ? `${mudancas} neste aparelho; sobem` : "O que você escrever sobe"} quando a rede voltar.
          </span>
        </>
      )}
    </p>
  );
}

function Trilho({ aoNavegar, aoBuscar }: { aoNavegar?: () => void; aoBuscar: () => void }) {
  const eu = useCompoze((s) => s.users.find((u) => u.id === s.currentUserId));
  const [, escuro] = useTema();
  const naoLidas = useNaoLidas();

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-7">
        <Link to="/" onClick={aoNavegar} aria-label="Compoze — Mesa">
          <Marca className="text-[17px]" />
        </Link>
      </div>

      <button
        onClick={aoBuscar}
        className="mx-5 mb-7 flex items-center gap-2 border-b border-linha-forte pb-2 text-left text-[13px] text-tinta-3 transition-colors hover:border-tinta hover:text-tinta-2"
      >
        <Search className="size-3.5" />
        <span className="flex-1">Buscar</span>
        <kbd className="numeral text-[10px] tracking-wider">⌘K</kbd>
      </button>

      <nav className="flex-1 space-y-6 overflow-y-auto" aria-label="Principal">
        <div>
          <div className="rotulo mb-1.5 px-5">Escrita</div>
          {ESCRITA.map((i) => (
            <ItemDoTrilho key={i.url} item={i} aoClicar={aoNavegar} />
          ))}
        </div>
        <div>
          <div className="rotulo mb-1.5 px-5">Gente</div>
          {GENTE.map((i) => (
            <ItemDoTrilho key={i.url} item={i} aoClicar={aoNavegar} contador={i.url === "/messages" ? naoLidas : 0} />
          ))}
        </div>
        <div>
          {RODAPE.map((i) => (
            <ItemDoTrilho key={i.url} item={i} aoClicar={aoNavegar} />
          ))}
        </div>
      </nav>

      <div className="border-t border-linha px-5 py-4">
        <EstadoDaRede />
        {MODO_DEMO && (
          <p className="mb-3 text-[11.5px] leading-snug text-tinta-3">
            <span className="text-lapis">●</span> Modo demonstração. Os dados ficam só neste navegador.
          </p>
        )}
        <div className="flex items-center gap-3">
          <Link to="/profile" onClick={aoNavegar} className="flex min-w-0 flex-1 items-center gap-2.5">
            <Monograma usuario={eu} tamanho="sm" />
            <span className="min-w-0">
              <span className="block truncate text-[13px] leading-tight font-medium">{eu?.name}</span>
              <span className="block truncate text-[12px] leading-tight text-tinta-3">@{eu?.username}</span>
            </span>
          </Link>
          <button
            onClick={() => definirTema(escuro ? "claro" : "escuro")}
            className="grid size-8 place-items-center rounded-sm text-tinta-3 hover:bg-papel-2 hover:text-tinta"
            aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"}
            title={escuro ? "Tema claro" : "Tema escuro"}
          >
            {escuro ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

const ABAS_MOVEIS = [
  { titulo: "Mesa", url: "/", exato: true },
  { titulo: "Canções", url: "/songs" },
  { titulo: "Projetos", url: "/projects" },
  { titulo: "Mural", url: "/feed" },
  { titulo: "Perfil", url: "/profile" },
];

export default function AppLayout() {
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const local = useLocation();
  const navegar = useNavigate();
  const noEditor = /^\/songs\/[^/]+\/edit/.test(local.pathname);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscaAberta((v) => !v);
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  useEffect(() => setGavetaAberta(false), [local.pathname]);

  // Logada, a pessoa tem o que perder no aparelho: pede para não ser apagado.
  useEffect(pedirArmazenamentoPersistente, []);
  useEffect(renovarAvisos, []);
  // Pede os avisos logo ao abrir. Onde o navegador exige um toque, oferece o botão.
  useEffect(() => {
    void ligarAvisosAoAbrir()
      .then((r) => {
        if (r !== "precisa-de-toque") return;
        toast("Quer saber na hora quando chegar mensagem ou convite?", {
          id: "pedir-avisos",
          duration: 15_000,
          action: { label: "Ligar avisos", onClick: () => void ligarAvisos().catch(() => undefined) },
        });
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => ouvirToqueNoAviso((caminho) => void navegar(caminho)), [navegar]);

  // O servidor recusou algo feito offline (permissão mudou, canção apagada por
  // outra pessoa…): avisa e relê, para a tela voltar ao que vale.
  useEffect(
    () =>
      quandoRecusar((pedido, erro) => {
        toast.error(`Não deu para salvar ${pedido.rotulo}: ${erro.message}`);
        const { currentUserId, hydrate } = useCompoze.getState();
        if (currentUserId) void hydrate(currentUserId);
      }),
    [],
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r border-linha lg:block">
        <Trilho aoBuscar={() => setBuscaAberta(true)} />
      </aside>

      {/* Barra superior no celular */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-linha bg-papel/92 px-4 backdrop-blur lg:hidden">
        <Link to="/" aria-label="Compoze — Mesa">
          <Marca className="text-[16px]" />
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={() => setBuscaAberta(true)} className="grid size-9 place-items-center text-tinta-2" aria-label="Buscar">
            <Search className="size-[18px]" />
          </button>
          <button onClick={() => setGavetaAberta(true)} className="grid size-9 place-items-center text-tinta-2" aria-label="Abrir menu">
            <IconeMenu className="size-[18px]" />
          </button>
        </div>
      </header>

      {gavetaAberta && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-papel/70 backdrop-blur-[2px]" onClick={() => setGavetaAberta(false)} />
          <div className="absolute inset-y-0 right-0 w-[280px] animate-[entrar_.2s_ease-out] border-l border-linha bg-papel">
            <button
              onClick={() => setGavetaAberta(false)}
              className="absolute top-5 right-4 grid size-8 place-items-center text-tinta-3"
              aria-label="Fechar menu"
            >
              <X className="size-4" />
            </button>
            <Trilho aoNavegar={() => setGavetaAberta(false)} aoBuscar={() => setBuscaAberta(true)} />
          </div>
        </div>
      )}

      <main className={cn("min-w-0", !noEditor && "pb-20 lg:pb-0")}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>

      {/* Abas no celular — escondidas no editor, que usa a barra de baixo para os blocos */}
      {!noEditor && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-linha bg-papel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
          aria-label="Atalhos"
        >
          {ABAS_MOVEIS.map((a) => (
            <NavLink
              key={a.url}
              to={a.url}
              end={a.exato}
              className={({ isActive }) =>
                cn(
                  "relative py-3.5 text-center text-[12.5px]",
                  isActive ? "font-medium text-tinta" : "text-tinta-3",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-x-6 top-0 h-[2px] bg-lapis" />}
                  {a.titulo}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}

      <BuscaGlobal aberta={buscaAberta} aoMudar={setBuscaAberta} />
      <AoVivo />
    </div>
  );
}

