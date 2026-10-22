import { QueryClientProvider } from "@tanstack/react-query";
import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import { RequireAuth } from "@/components/auth/RequireAuth";
import AppLayout from "@/components/layout/AppLayout";
import { ProvedorDeDicas } from "@/components/ui/Dica";
import { queryClient } from "@/lib/queryClient";
import { useTema } from "@/lib/tema";
import Dashboard from "@/pages/app/Dashboard";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import NotFound from "@/pages/NotFound";

// A Mesa vem no pacote principal; o resto carrega quando a pessoa abre.
const Songs = lazy(() => import("@/pages/app/Songs"));
const SongEditor = lazy(() => import("@/pages/app/SongEditor"));
const Folders = lazy(() => import("@/pages/app/Folders"));
const Projects = lazy(() => import("@/pages/app/Projects"));
const ProjectDetail = lazy(() => import("@/pages/app/ProjectDetail"));
const Feed = lazy(() => import("@/pages/app/Feed"));
const Messages = lazy(() => import("@/pages/app/Messages"));
const MapPage = lazy(() => import("@/pages/app/Map"));
const Profile = lazy(() => import("@/pages/app/Profile"));
const Trash = lazy(() => import("@/pages/app/Trash"));
const Settings = lazy(() => import("@/pages/app/Settings"));

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
                <Route path="/map" element={<MapPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:username" element={<Profile />} />
                <Route path="/trash" element={<Trash />} />
                <Route path="/settings" element={<Settings />} />
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
