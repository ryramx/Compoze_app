import type { ReactNode } from "react";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";

export function Confirmar({
  aberto,
  aoMudar,
  titulo,
  descricao,
  acao,
  aoConfirmar,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  titulo: string;
  descricao: ReactNode;
  acao: string;
  aoConfirmar: () => void;
}) {
  return (
    <Dialogo
      aberto={aberto}
      aoMudar={aoMudar}
      titulo={titulo}
      descricao={descricao}
      largura="sm"
      rodape={
        <>
          <Botao variante="texto" onClick={() => aoMudar(false)}>
            Cancelar
          </Botao>
          <Botao
            variante="lapis"
            onClick={() => {
              aoConfirmar();
              aoMudar(false);
            }}
          >
            {acao}
          </Botao>
        </>
      }
    />
  );
}
