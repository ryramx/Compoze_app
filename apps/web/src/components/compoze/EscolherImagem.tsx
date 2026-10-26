import { useRef, useState } from "react";
import { toast } from "sonner";
import { AVATAR_LADO_PX, CAPA_DO_PERFIL_LADO_PX, CAPA_DO_PERFIL_PROPORCAO, CAPA_LADO_PX } from "@compoze/contracts/imagens";
import { Recortar } from "@/components/compoze/Recortar";
import { Botao } from "@/components/ui/Botao";
import { ApiError } from "@/lib/api";
import { recortarImagem, type Recorte } from "@/lib/imagens";

/** Moldura de cada lugar onde entra uma imagem (ADR 0022). */
const FORMATOS = {
  avatar: { titulo: "Recortar a foto", proporcao: 1, redondo: true, lado: AVATAR_LADO_PX },
  "capa-do-perfil": { titulo: "Recortar a capa", proporcao: CAPA_DO_PERFIL_PROPORCAO, redondo: false, lado: CAPA_DO_PERFIL_LADO_PX },
  "capa-de-projeto": { titulo: "Recortar a capa", proporcao: 1, redondo: false, lado: CAPA_LADO_PX },
} as const;

/**
 * Par de botões "trocar / tirar" para foto de perfil e capa (ADR 0015). O
 * seletor de arquivo do sistema já oferece a câmera no celular. A foto
 * escolhida passa pela janela de recorte antes de subir (ADR 0022).
 */
export function EscolherImagem({
  formato,
  temImagem,
  rotuloTrocar,
  rotuloTirar,
  trocar,
}: {
  formato: keyof typeof FORMATOS;
  temImagem: boolean;
  rotuloTrocar: string;
  rotuloTirar: string;
  /** Recebe a imagem já recortada e reduzida, ou null para tirar. */
  trocar: (imagem: Blob | null) => Promise<void>;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [escolhida, setEscolhida] = useState<File | null>(null);
  const f = FORMATOS[formato];

  async function aplicar(arquivo: Blob | null, recorte?: Recorte) {
    setOcupado(true);
    try {
      await trocar(arquivo ? await recortarImagem(arquivo, f.lado, recorte) : null);
    } catch (e) {
      toast.error(
        e instanceof ApiError && e.status !== 0
          ? e.message
          : e instanceof ApiError
            ? "Trocar a imagem precisa de internet."
            : "Não deu para abrir essa imagem. Tente uma foto JPEG ou PNG.",
      );
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          e.target.value = "";
          if (arquivo) setEscolhida(arquivo);
        }}
      />
      {escolhida && (
        <Recortar
          arquivo={escolhida}
          titulo={f.titulo}
          proporcao={f.proporcao}
          redondo={f.redondo}
          aoCancelar={() => setEscolhida(null)}
          aoConfirmar={(recorte) => {
            setEscolhida(null);
            void aplicar(escolhida, recorte);
          }}
        />
      )}
      <Botao tamanho="sm" disabled={ocupado} onClick={() => entrada.current?.click()}>
        {ocupado ? "Enviando…" : rotuloTrocar}
      </Botao>
      {temImagem && (
        <Botao tamanho="sm" variante="texto" disabled={ocupado} onClick={() => void aplicar(null)}>
          {rotuloTirar}
        </Botao>
      )}
    </div>
  );
}
