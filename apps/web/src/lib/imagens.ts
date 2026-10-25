/**
 * Foto de perfil e capa de projeto (Fase 4c, ADR 0015). A imagem é reduzida
 * no aparelho antes de subir: uma foto de celular tem 4 MB, a capa precisa
 * de 1200 px. Menos dados no plano de quem envia e no Postgres gratuito.
 */

import { URL_DA_API } from "@/lib/api";

/**
 * Endereço que um `<img>` consegue abrir. A API guarda `/images/{id}`,
 * relativo a ela; URLs de fora e `data:` (modo demo) passam como vieram.
 */
export function enderecoDaImagem(url: string | null | undefined): string {
  if (!url) return "";
  return url.startsWith("/images/") ? `${URL_DA_API}${url}` : url;
}

/** Medidas finais: o lado maior vira `lado`, sem nunca ampliar. */
export function medidas(largura: number, altura: number, lado: number): { largura: number; altura: number } {
  const escala = Math.min(1, lado / Math.max(largura, altura));
  return { largura: Math.max(1, Math.round(largura * escala)), altura: Math.max(1, Math.round(altura * escala)) };
}

/**
 * Reduz e recomprime. WebP onde o navegador sabe gerar; JPEG no resto (o
 * Safari antigo devolve PNG quando não conhece o tipo pedido, e PNG de foto
 * pesa demais). A orientação EXIF já vem aplicada por `createImageBitmap`.
 */
export async function reduzirImagem(arquivo: Blob, lado: number): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  const { largura, altura } = medidas(bitmap.width, bitmap.height, lado);
  const tela = document.createElement("canvas");
  tela.width = largura;
  tela.height = altura;
  const ctx = tela.getContext("2d");
  if (!ctx) throw new Error("Este navegador não desenha imagens.");
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  const gerar = (tipo: string) => new Promise<Blob | null>((ok) => tela.toBlob(ok, tipo, 0.85));
  const webp = await gerar("image/webp");
  if (webp?.type === "image/webp") return webp;
  const jpeg = await gerar("image/jpeg");
  if (!jpeg) throw new Error("Não foi possível preparar a imagem.");
  return jpeg;
}
