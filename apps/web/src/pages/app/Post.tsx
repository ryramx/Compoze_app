import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { Vazio } from "@/components/compoze/Cabecalho";
import { Publicacao } from "@/components/gente/Publicacao";
import { Pagina } from "@/components/layout/Pagina";
import { useOnline } from "@/lib/rede";
import * as gente from "@/services/api/genteService";

/**
 * Uma publicação sozinha, com os comentários abertos: é para onde levam as
 * novidades e os avisos de comentário e curtida (ADR 0023).
 */
export default function Post() {
  const { id = "" } = useParams();
  const online = useOnline();
  const { data: post, isPending, isError } = useQuery({
    queryKey: ["publicacao", id],
    queryFn: () => gente.publicacao(id),
    enabled: online && !!id,
  });

  return (
    <Pagina estreita>
      <Link to="/feed" className="rotulo hover:text-tinta">
        ← Mural
      </Link>
      <div className="mt-6">
        {!online ? (
          <Vazio frase="A publicação precisa de internet." />
        ) : isError ? (
          <Vazio frase="Essa publicação não existe mais." />
        ) : isPending || !post ? (
          <p className="text-[13px] text-tinta-3 italic">Abrindo…</p>
        ) : (
          <ul>
            <Publicacao post={post} comentariosAbertos />
          </ul>
        )}
      </div>
    </Pagina>
  );
}
