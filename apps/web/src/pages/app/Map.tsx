import "leaflet/dist/leaflet.css";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { Link } from "react-router";
import { Cabecalho, Vazio } from "@/components/compoze/Cabecalho";
import { Monograma } from "@/components/compoze/Monograma";
import { corDoAutor, iniciais } from "@/lib/autoria";
import { Pagina } from "@/components/layout/Pagina";
import { cn } from "@/lib/cn";
import { useTema } from "@/lib/tema";
import * as userApi from "@/services/api/userService";
import type { User } from "@/types";

function icone(u: User, ativo: boolean) {
  const cor = corDoAutor(u.authorColor);
  return L.divIcon({
    className: "marcador-mapa",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:999px;font:italic 13px var(--font-serif);color:${ativo ? "var(--folha)" : cor};background:${ativo ? cor : "var(--folha)"};box-shadow:inset 0 0 0 1.5px ${cor},0 6px 14px -6px rgb(0 0 0 / .4)">${iniciais(u.name)}</span>`,
  });
}

function Voar({ alvo }: { alvo?: User }) {
  const mapa = useMap();
  useEffect(() => {
    if (alvo) mapa.flyTo([alvo.location.lat, alvo.location.lng], 6, { duration: 0.8 });
  }, [alvo, mapa]);
  return null;
}

export default function MapPage() {
  const { data: pessoas = [], isPending } = useQuery({ queryKey: ["mapa"], queryFn: userApi.noMapa });
  const [, escuro] = useTema();
  const [ativoId, setAtivoId] = useState<string | null>(null);

  // Só aparece quem tem posição. No servidor real, isso depende de a pessoa ter
  // escolhido aparecer no mapa (RN11); o perfil público não manda coordenadas.
  const noMapa = useMemo(() => pessoas.filter((u) => u.location.lat || u.location.lng), [pessoas]);
  const ativo = noMapa.find((u) => u.id === ativoId);

  const porCidade = useMemo(() => {
    const m = new Map<string, User[]>();
    for (const u of noMapa) {
      const k = [u.location.city, u.location.country].filter(Boolean).join(", ") || "Sem cidade";
      m.set(k, [...(m.get(k) ?? []), u]);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [noMapa]);

  return (
    <Pagina>
      <Cabecalho indice="07" secao="Gente" titulo="Mapa" descricao="Quem compõe perto de você. Só aparece quem escolheu aparecer." />

      {isPending ? null : noMapa.length === 0 ? (
        <div className="mt-8">
          <Vazio frase="Ninguém no mapa ainda." />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="h-[62vh] min-h-[380px] overflow-hidden border border-linha">
            <MapContainer center={[-15.8, -47.9]} zoom={4} scrollWheelZoom className="size-full" attributionControl>
              <TileLayer
                key={escuro ? "e" : "c"}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                url={`https://{s}.basemaps.cartocdn.com/${escuro ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png`}
              />
              {noMapa.map((u) => (
                <Marker key={u.id} position={[u.location.lat, u.location.lng]} icon={icone(u, u.id === ativoId)} eventHandlers={{ click: () => setAtivoId(u.id) }} />
              ))}
              <Voar alvo={ativo} />
            </MapContainer>
          </div>

          <aside>
            {ativo && (
              <div className="mb-8 border border-linha bg-folha p-5">
                <Monograma usuario={ativo} tamanho="lg" />
                <div className="mt-3 font-serif text-[1.5rem] leading-tight">{ativo.name}</div>
                <div className="text-[13px] text-tinta-3">
                  @{ativo.username} · {ativo.location.city}
                </div>
                {ativo.bio && <p className="mt-3 text-[14px] text-tinta-2">{ativo.bio}</p>}
                <Link to={`/profile/${ativo.username}`} className="link-sublinhado mt-4 inline-block text-[13px]">
                  Ver perfil
                </Link>
              </div>
            )}
            {porCidade.map(([cidade, gente]) => (
              <div key={cidade} className="mb-6">
                <div className="rotulo mb-1 flex justify-between border-b border-linha pb-1.5">
                  <span>{cidade}</span>
                  <span className="numeral">{gente.length}</span>
                </div>
                <ul>
                  {gente.map((u) => (
                    <li key={u.id}>
                      <button
                        onClick={() => setAtivoId(u.id)}
                        className={cn("flex w-full items-center gap-2.5 py-2 text-left text-[14px]", u.id === ativoId ? "text-lapis" : "hover:text-lapis")}
                      >
                        <Monograma usuario={u} tamanho="xs" />
                        {u.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>
        </div>
      )}
    </Pagina>
  );
}
