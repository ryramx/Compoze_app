import { NATIVO } from "@/lib/nativo";

/**
 * Entrega um arquivo gerado no aparelho (exportação, ADR 0024).
 *
 * No navegador e na PWA, é um download comum. No app Android, a WebView não
 * baixa arquivos: o arquivo vai para o cache do app e abre a folha de
 * compartilhar do Android, de onde a pessoa salva em Arquivos, no Drive ou
 * manda pelo WhatsApp.
 */
export async function salvarArquivo(nome: string, tipo: string, bytes: Uint8Array): Promise<"baixado" | "compartilhado"> {
  if (NATIVO) {
    const [{ Directory, Filesystem }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
    const { uri } = await Filesystem.writeFile({ path: `exportados/${nome}`, data: emBase64(bytes), directory: Directory.Cache, recursive: true });
    try {
      await Share.share({ title: nome, files: [uri], dialogTitle: "Salvar ou enviar" });
    } catch (e) {
      // Fechar a folha sem escolher nada não é erro.
      if (!/cancel/i.test(String((e as Error)?.message ?? e))) throw e;
    }
    return "compartilhado";
  }

  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // O navegador precisa do endereço até começar o download.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return "baixado";
}

function emBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
