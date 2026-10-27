import { AtSign, Heart, HandCoins, MessageCircle, MessageSquare, UserPlus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Monograma } from "@/components/compoze/Monograma";
import { cn } from "@/lib/cn";
import { quando } from "@/lib/datas";
import { usuarioDaApi } from "@/services/api/adapters";
import type { ApiNotification } from "@/services/api/dto";

const ICONES: Record<ApiNotification["kind"], LucideIcon> = {
  MESSAGE: MessageSquare,
  COMMENT: MessageCircle,
  LIKE: Heart,
  FOLLOW: UserPlus,
  INVITE: AtSign,
  INVITE_ACCEPTED: AtSign,
  SUPPORT: HandCoins,
  SUPPORT_CONFIRMED: HandCoins,
};

const reais = (n: number | null) => `R$ ${(n ?? 0).toLocaleString("pt-BR")}`;

/** A frase de cada novidade, com o nome em destaque. */
function frase(n: ApiNotification): { texto: ReactNode; trecho: string | null } {
  const quem = <span className="font-medium text-tinta">{n.actor?.name ?? "Alguém"}</span>;
  const titulo = (t: string | null) => <em>“{t ?? "sem título"}”</em>;
  switch (n.kind) {
    case "MESSAGE":
      return { texto: <>{quem} escreveu para você</>, trecho: n.excerpt };
    case "COMMENT":
      return { texto: <>{quem} comentou sua publicação</>, trecho: n.excerpt };
    case "LIKE":
      return { texto: <>{quem} curtiu sua publicação</>, trecho: n.subject };
    case "FOLLOW":
      return { texto: <>{quem} começou a seguir você</>, trecho: null };
    case "INVITE":
      return { texto: <>{quem} te chamou para escrever {titulo(n.subject)}</>, trecho: null };
    case "INVITE_ACCEPTED":
      return { texto: <>{quem} aceitou o convite para {titulo(n.subject)}</>, trecho: null };
    case "SUPPORT":
      return { texto: <>{quem} diz que mandou {reais(n.amount)} para {titulo(n.subject)}. Confira no banco.</>, trecho: null };
    case "SUPPORT_CONFIRMED":
      return { texto: <>{quem} confirmou seu apoio de {reais(n.amount)} a {titulo(n.subject)}</>, trecho: null };
  }
}

/** Uma linha da lista: rosto, frase, trecho e quando. A nova leva o traço do lápis. */
export function LinhaDeNovidade({ n }: { n: ApiNotification }) {
  const { texto, trecho } = frase(n);
  const Icone = ICONES[n.kind];
  const pessoa = n.actor ? usuarioDaApi(n.actor) : undefined;
  return (
    <li>
      <Link
        to={n.url}
        className={cn(
          "group relative flex gap-3 py-3 pr-1 pl-4 transition-colors hover:bg-papel-2/50",
          n.unread && "bg-bege/60",
        )}
      >
        {/* O mesmo traço que marca a seção aberta no menu marca o que é novo. */}
        <span aria-hidden className={cn("absolute top-3 bottom-3 left-0 w-[2px] bg-lapis", !n.unread && "opacity-0")} />
        <span className="relative shrink-0">
          <Monograma usuario={pessoa} tamanho="sm" />
          <span className="absolute -right-1 -bottom-1 grid size-[18px] place-items-center rounded-full border border-linha bg-papel text-tinta-2">
            <Icone aria-hidden className="size-2.5" strokeWidth={2} />
          </span>
        </span>
        <span className="min-w-0 flex-1 text-[14px] leading-snug">
          <span className={cn("text-tinta-2", n.unread && "text-tinta")}>{texto}</span>
          {n.unread && <span className="sr-only"> (nova)</span>}
          {trecho && <span className="mt-0.5 line-clamp-2 block font-serif text-[1.02rem] text-tinta-2">{trecho}</span>}
          <span className="mt-1 flex items-center gap-2 text-[12px] text-tinta-3">
            {quando(n.at)}
            {n.kind === "MESSAGE" && (n.count ?? 0) > 1 && (
              <span className="numeral bg-lapis px-1.5 text-[10.5px] leading-[1.15rem] text-papel">{n.count} novas</span>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function ListaDeNovidades({ itens, className }: { itens: ApiNotification[]; className?: string }) {
  return (
    <ul className={cn("divide-y divide-linha", className)}>
      {itens.map((n) => (
        <LinhaDeNovidade key={n.id} n={n} />
      ))}
    </ul>
  );
}
