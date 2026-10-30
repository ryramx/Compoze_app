import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// O jsdom não tem Blob.text() nem Blob.arrayBuffer(), que os navegadores têm
// há anos; a importação de arquivos (ADR 0024) usa os dois.
function lerBlob(blob: Blob, como: "texto" | "bytes"): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result as string | ArrayBuffer);
    leitor.onerror = () => reject(leitor.error);
    if (como === "texto") leitor.readAsText(blob);
    else leitor.readAsArrayBuffer(blob);
  });
}
if (typeof Blob.prototype.text !== "function") {
  Blob.prototype.text = function () {
    return lerBlob(this, "texto") as Promise<string>;
  };
}
if (typeof Blob.prototype.arrayBuffer !== "function") {
  Blob.prototype.arrayBuffer = function () {
    return lerBlob(this, "bytes") as Promise<ArrayBuffer>;
  };
}
