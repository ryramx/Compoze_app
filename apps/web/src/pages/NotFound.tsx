import { Link } from "react-router";
import { Marca } from "@/components/compoze/Marca";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-start justify-center gap-6 px-8 md:px-24">
      <Marca className="text-lg" />
      <div className="numeral text-[13px] text-lapis">404</div>
      <h1 className="titulo-pagina max-w-2xl">Esta página não está no caderno.</h1>
      <Link to="/" className="link-sublinhado text-tinta-2">
        Voltar para a Mesa
      </Link>
    </div>
  );
}
