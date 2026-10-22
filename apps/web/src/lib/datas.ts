import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

/** "há 3 horas", "ontem", "12 mar". Curto o bastante para caber numa coluna de tabela. */
export function quando(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const horas = (Date.now() - d.getTime()) / 3_600_000;
  if (horas < 1 / 60) return "agora";
  if (isToday(d)) return `há ${formatDistanceToNowStrict(d, { locale: ptBR })}`;
  if (isYesterday(d)) return "ontem";
  if (horas < 24 * 6) return format(d, "EEEE", { locale: ptBR });
  if (d.getFullYear() === new Date().getFullYear()) return format(d, "d MMM", { locale: ptBR });
  return format(d, "d MMM yyyy", { locale: ptBR });
}

export const dataLonga = (iso: string) =>
  iso ? format(new Date(iso), "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : "";

export const hojePorExtenso = () => format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

export function saudacao(): string {
  const h = new Date().getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
