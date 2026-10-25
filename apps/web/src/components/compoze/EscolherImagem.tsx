import { useRef, useState } from "react";
import { toast } from "sonner";
import { Botao } from "@/components/ui/Botao";
import { ApiError } from "@/lib/api";

/**
 * Par de botões "trocar / tirar" para foto de perfil e capa (ADR 0015). O
 * seletor de arquivo do sistema já oferece a câmera no celular.
 */
export function EscolherImagem({
  temImagem,
  rotuloTrocar,
  rotuloTirar,
  trocar,
}: {
  temImagem: boolean;
  rotuloTrocar: string;
  rotuloTirar: string;
  trocar: (arquivo: Blob | null) => Promise<void>;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);

  async function aplicar(arquivo: Blob | null) {
    setOcupado(true);
    try {
      await trocar(arquivo);
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
          if (arquivo) void aplicar(arquivo);
        }}
      />
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
