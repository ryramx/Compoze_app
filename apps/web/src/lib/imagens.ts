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

/** Retângulo em pixels da imagem original (já com a orientação EXIF). */
export interface Recorte {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

/**
 * Parte da imagem que cabe numa moldura de `proporcao` (largura/altura),
 * centrada em (`cx`, `cy`) e ampliada `zoom` vezes além do mínimo que cobre a
 * moldura. O centro é empurrado para dentro: a moldura nunca mostra vazio.
 */
export function areaDoRecorte(
  imagem: { largura: number; altura: number },
  proporcao: number,
  zoom: number,
  cx: number,
  cy: number,
): Recorte {
  // Com zoom 1, a maior moldura de `proporcao` que cabe inteira na imagem.
  const largura0 = Math.min(imagem.largura, imagem.altura * proporcao);
  const largura = largura0 / Math.max(1, zoom);
  const altura = largura / proporcao;
  const x = Math.min(Math.max(cx - largura / 2, 0), imagem.largura - largura);
  const y = Math.min(Math.max(cy - altura / 2, 0), imagem.altura - altura);
  return { x, y, largura, altura };
}

/**
 * Recorta, reduz e recomprime. WebP onde o navegador sabe gerar; JPEG no
 * resto (o Safari antigo devolve PNG quando não conhece o tipo pedido, e PNG
 * de foto pesa demais). A orientação EXIF já vem aplicada por
 * `createImageBitmap`. Sem `recorte`, vai a imagem inteira.
 */
export async function recortarImagem(arquivo: Blob, lado: number, recorte?: Recorte): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  const r = recorte ?? { x: 0, y: 0, largura: bitmap.width, altura: bitmap.height };
  const { largura, altura } = medidas(r.largura, r.altura, lado);
  const tela = document.createElement("canvas");
  tela.width = largura;
  tela.height = altura;
  const ctx = tela.getContext("2d");
  if (!ctx) throw new Error("Este navegador não desenha imagens.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, r.x, r.y, r.largura, r.altura, 0, 0, largura, altura);
  bitmap.close();

  const gerar = (tipo: string) => new Promise<Blob | null>((ok) => tela.toBlob(ok, tipo, 0.85));
  const webp = await gerar("image/webp");
  if (webp?.type === "image/webp") return webp;
  const jpeg = await gerar("image/jpeg");
  if (!jpeg) throw new Error("Não foi possível preparar a imagem.");
  return jpeg;
}
