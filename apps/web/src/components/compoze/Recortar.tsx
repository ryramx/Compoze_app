import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Minus, Plus } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";
import { cn } from "@/lib/cn";
import { areaDoRecorte, type Recorte } from "@/lib/imagens";

const ZOOM_MAX = 4;
/** Folga em volta da moldura: mostra, apagado, o que fica de fora. */
const FOLGA = 20;

/**
 * Janela de recorte (ADR 0022). A moldura fica parada e a foto anda por
 * baixo dela: arrastar posiciona, o controle (ou a roda, ou a pinça) aproxima.
 * O que cai fora da moldura aparece apagado, para dar noção do corte.
 */
export function Recortar({
  arquivo,
  titulo,
  proporcao,
  redondo = false,
  aoCancelar,
  aoConfirmar,
}: {
  arquivo: Blob;
  titulo: string;
  /** Largura dividida pela altura da moldura. */
  proporcao: number;
  redondo?: boolean;
  aoCancelar: () => void;
  aoConfirmar: (recorte: Recorte) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [imagem, setImagem] = useState<{
    largura: number;
    altura: number;
  } | null>(null);
  const [palco, setPalco] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [centro, setCentro] = useState({ x: 0, y: 0 });
  // Ref por estado: o Radix monta o conteúdo do diálogo depois do primeiro
  // render, e os efeitos precisam saber quando o palco existe.
  const [palcoEl, setPalcoEl] = useState<HTMLDivElement | null>(null);
  const dedos = useRef(new Map<number, { x: number; y: number }>());

  // Criado e revogado no mesmo efeito, para o StrictMode não revogar o
  // endereço que ainda está em uso.
  useEffect(() => {
    const u = URL.createObjectURL(arquivo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [arquivo]);

  // O palco é medido, não fixo: a mesma janela serve no celular e no PC.
  useEffect(() => {
    if (!palcoEl) return;
    const ro = new ResizeObserver(([e]) => setPalco(e!.contentRect.width));
    ro.observe(palcoEl);
    return () => ro.disconnect();
  }, [palcoEl]);

  // Moldura: a largura toda na capa; no avatar, um círculo de até 280 px.
  const larguraDaMoldura = Math.max(
    0,
    Math.min(palco - FOLGA * 2, proporcao <= 1 ? 280 * proporcao : Infinity),
  );
  const alturaDaMoldura = larguraDaMoldura / proporcao;
  const area = imagem
    ? areaDoRecorte(imagem, proporcao, zoom, centro.x, centro.y)
    : null;
  const escala = area ? larguraDaMoldura / area.largura : 1;
  const esquerdaDaMoldura = (palco - larguraDaMoldura) / 2;

  // Guarda o centro já empurrado para dentro, senão arrastar além da borda
  // "acumula" e a foto demora a voltar.
  function mover(x: number, y: number, z = zoom) {
    if (!imagem) return;
    const a = areaDoRecorte(imagem, proporcao, z, x, y);
    setZoom(z);
    setCentro({ x: a.x + a.largura / 2, y: a.y + a.altura / 2 });
  }

  const aproximar = (z: number) =>
    mover(centro.x, centro.y, Math.min(ZOOM_MAX, Math.max(1, z)));

  // A roda do mouse precisa de ouvinte não passivo para não rolar a página.
  const aproximarRef = useRef(aproximar);
  aproximarRef.current = aproximar;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    const el = palcoEl;
    if (!el) return;
    const roda = (e: WheelEvent) => {
      e.preventDefault();
      aproximarRef.current(zoomRef.current * Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener("wheel", roda, { passive: false });
    return () => el.removeEventListener("wheel", roda);
  }, [palcoEl]);

  function aoApertar(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function aoArrastar(e: PointerEvent<HTMLDivElement>) {
    const antes = dedos.current.get(e.pointerId);
    if (!antes) return;
    const outros = [...dedos.current.entries()].filter(
      ([id]) => id !== e.pointerId,
    );
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (outros.length === 0) {
      mover(
        centro.x - (e.clientX - antes.x) / escala,
        centro.y - (e.clientY - antes.y) / escala,
      );
      return;
    }
    // Pinça: a razão entre as distâncias dos dois dedos, antes e agora.
    const o = outros[0]![1];
    const d0 = Math.hypot(antes.x - o.x, antes.y - o.y);
    const d1 = Math.hypot(e.clientX - o.x, e.clientY - o.y);
    if (d0 > 0) aproximar(zoom * (d1 / d0));
  }

  function aoSoltar(e: PointerEvent<HTMLDivElement>) {
    dedos.current.delete(e.pointerId);
  }

  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    const passo = 12 / escala;
    const setas: Record<string, [number, number]> = {
      ArrowLeft: [-passo, 0],
      ArrowRight: [passo, 0],
      ArrowUp: [0, -passo],
      ArrowDown: [0, passo],
    };
    if (setas[e.key]) {
      e.preventDefault();
      mover(centro.x + setas[e.key]![0], centro.y + setas[e.key]![1]);
    } else if (e.key === "+" || e.key === "=") {
      aproximar(zoom * 1.1);
    } else if (e.key === "-") {
      aproximar(zoom / 1.1);
    }
  }

  return (
    <Dialogo
      aberto
      aoMudar={(aberto) => !aberto && aoCancelar()}
      titulo={titulo}
      descricao="Arraste a foto para escolher o que aparece. Aproxime no controle, na roda do mouse ou com dois dedos."
      largura="lg"
      rodape={
        <>
          <Botao variante="texto" onClick={aoCancelar}>
            Cancelar
          </Botao>
          <Botao
            variante="tinta"
            disabled={!area}
            onClick={() => area && aoConfirmar(area)}
          >
            Usar este recorte
          </Botao>
        </>
      }
    >
      <div
        ref={setPalcoEl}
        role="application"
        aria-label="Área de recorte. Setas movem a foto; mais e menos aproximam."
        tabIndex={0}
        onPointerDown={aoApertar}
        onPointerMove={aoArrastar}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onKeyDown={aoTeclar}
        className="relative -mx-6 -mt-5 cursor-grab touch-none overflow-hidden bg-papel-2 select-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-tinta active:cursor-grabbing"
        style={{ height: alturaDaMoldura + FOLGA * 2 }}
      >
        {url && (
          <img
            src={url}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const { naturalWidth: largura, naturalHeight: altura } =
                e.currentTarget;
              setImagem({ largura, altura });
              setCentro({ x: largura / 2, y: altura / 2 });
            }}
            className="pointer-events-none absolute max-w-none origin-top-left"
            style={
              area && imagem
                ? {
                    left: esquerdaDaMoldura - area.x * escala,
                    top: FOLGA - area.y * escala,
                    width: imagem.largura * escala,
                    height: imagem.altura * escala,
                  }
                : { visibility: "hidden" }
            }
          />
        )}
        {/* A moldura: o resto do palco fica sob um véu de papel. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute border border-papel",
            redondo && "rounded-full",
          )}
          style={{
            left: esquerdaDaMoldura,
            top: FOLGA,
            width: larguraDaMoldura,
            height: alturaDaMoldura,
            boxShadow:
              "0 0 0 9999px color-mix(in srgb, var(--color-papel) 72%, transparent)",
          }}
        />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          aria-label="Afastar"
          className="text-tinta-3 hover:text-tinta"
          onClick={() => aproximar(zoom / 1.2)}
        >
          <Minus className="size-4" />
        </button>
        <input
          type="range"
          aria-label="Aproximar"
          min={1}
          max={ZOOM_MAX}
          step={0.01}
          value={zoom}
          onChange={(e) => aproximar(Number(e.target.value))}
          className="w-full accent-tinta"
        />
        <button
          type="button"
          aria-label="Aproximar mais"
          className="text-tinta-3 hover:text-tinta"
          onClick={() => aproximar(zoom * 1.2)}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </Dialogo>
  );
}
