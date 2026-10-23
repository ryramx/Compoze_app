/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** URL base da API do Compoze, ou "demo" para o servidor de demonstração. */
  readonly VITE_API_URL: string;
  /** Endereço público do front, para links. Só o build do app Android define. */
  readonly VITE_WEB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
