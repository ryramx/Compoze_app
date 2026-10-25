import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, useEffect } from "react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router";
import { Toaster } from "sonner";
import { RequireAuth } from "@/components/auth/RequireAuth";
import AppLayout from "@/components/layout/AppLayout";
import { ProvedorDeDicas } from "@/components/ui/Dica";
import { ouvirCompartilhamento } from "@/lib/nativo";
import { queryClient } from "@/lib/queryClient";
import { useTema } from "@/lib/tema";
import Dashboard from "@/pages/app/Dashboard";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import NotFound from "@/pages/NotFound";

// A Mesa vem no pacote principal; o resto carrega quando a pessoa abre.
const paginas = {
  Songs: () => import("@/pages/app/Songs"),
  SongEditor: () => import("@/pages/app/SongEditor"),
  Folders: () => import("@/pages/app/Folders"),
  Projects: () => import("@/pages/app/Projects"),
  ProjectDetail: () => import("@/pages/app/ProjectDetail"),
  Feed: () => import("@/pages/app/Feed"),
  Messages: () => import("@/pages/app/Messages"),
  Map: () => import("@/pages/app/Map"),
  Profile: () => import("@/pages/app/Profile"),
  Trash: () => import("@/pages/app/Trash"),
  Settings: () => import("@/pages/app/Settings"),
  Convite: () => import("@/pages/app/Convite"),
  Compartilhar: () => import("@/pages/app/Compartilhar"),
  // Não é página, mas criar canção offline precisa dele (ADR 0008).
  folhaInicial: () => import("@/lib/folhaInicial"),
};
const Songs = lazy(paginas.Songs);
const SongEditor = lazy(paginas.SongEditor);
const Folders = lazy(paginas.Folders);
const Projects = lazy(paginas.Projects);
const ProjectDetail = lazy(paginas.ProjectDetail);
const Feed = lazy(paginas.Feed);
const Messages = lazy(paginas.Messages);
const MapPage = lazy(paginas.Map);
const Profile = lazy(paginas.Profile);
const Trash = lazy(paginas.Trash);
const Settings = lazy(paginas.Settings);
const Convite = lazy(paginas.Convite);
const Compartilhar = lazy(paginas.Compartilhar);

// Com rede, baixa o resto do app logo depois de abrir: se a rede cair depois,
// as telas ainda não visitadas continuam abrindo. Em produção o service worker
// já guarda tudo (lib/pwa.ts); isto cobre a primeira visita, antes de ele
// assumir, e o modo de desenvolvimento, que não tem service worker.
if (typeof window !== "undefined") {
  const baixar = () => {
    if (navigator.onLine) for (const f of Object.values(paginas)) void f().catch(() => undefined);
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(baixar, { timeout: 5000 });
  else setTimeout(baixar, 3000);
}

/** Texto compartilhado de outro app no Android vai para /compartilhar (Fase 3b). */
function RecebeCompartilhamento() {
  const navegar = useNavigate();
  useEffect(
    () =>
      ouvirCompartilhamento(({ titulo, texto }) => {
        const busca = new URLSearchParams({ text: texto });
        if (titulo) busca.set("title", titulo);
        navegar(`/compartilhar?${busca}`);
      }),
    [navegar],
  );
  return null;
}

function Avisos() {
  const [, escuro] = useTema();
  return (
    <Toaster
      theme={escuro ? "dark" : "light"}
      position="bottom-center"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex items-center gap-3 border border-linha-forte bg-folha px-4 py-3 text-sm text-tinta shadow-folha min-w-[280px]",
          description: "text-tinta-2",
          actionButton: "ml-auto text-lapis font-medium",
          error: "border-lapis/50",
        },
      }}
    />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProvedorDeDicas>
        <BrowserRouter>
          <RecebeCompartilhamento />
          <Routes>
            {/* Rotas públicas: quem não entrou não vê navegação nem busca. */}
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Register />} />

            {/* Tudo abaixo exige sessão. O backend verifica cada requisição de
                qualquer forma; isto evita telas vazias e chamadas que só
                voltariam 401. */}
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/songs" element={<Songs />} />
                <Route path="/songs/:id/edit" element={<SongEditor />} />
                <Route path="/folders" element={<Folders />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/feed" element={<Feed />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:id" element={<Messages />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:username" element={<Profile />} />
                <Route path="/trash" element={<Trash />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/convite/:token" element={<Convite />} />
                <Route path="/compartilhar" element={<Compartilhar />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Avisos />
      </ProvedorDeDicas>
    </QueryClientProvider>
  );
}
