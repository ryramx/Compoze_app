/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API do Compoze, ou "demo" para o servidor de demonstração. */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
