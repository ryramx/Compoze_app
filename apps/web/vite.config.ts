import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA (Fase 2c, ADR 0005): o app instala na tela inicial e abre sem rede.
    // O service worker guarda o app inteiro; os dados ficam no IndexedDB e na
    // fila (ADR 0008), não no cache do service worker.
    VitePWA({
      // A versão nova espera a pessoa aceitar (aviso em lib/pwa.ts): trocar o
      // app no meio de uma frase recarregaria a página.
      registerType: "prompt",
      injectRegister: false,
      manifest: {
        name: "Compoze",
        short_name: "Compoze",
        description: "O caderno compartilhado de quem compõe.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#f3efe6",
        theme_color: "#f3efe6",
        // "Compartilhar para o Compoze" na PWA instalada (Fase 3b). O mesmo
        // destino recebe o texto do app Android.
        share_target: {
          action: "/compartilhar",
          method: "GET",
          params: { title: "title", text: "text", url: "url" },
        },
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Só as fontes latinas entram no pacote offline; os outros alfabetos
        // (cirílico, vietnamita…) baixam quando usados e ficam guardados.
        globPatterns: ["**/*.{js,css,html,svg,png}", "**/*-latin-*.woff2", "**/*-latin-ext-*.woff2"],
        globIgnores: ["**/*-cyrillic*", "**/*-greek*", "**/*-vietnamese*"],
        // O editor, com Yjs, passa do limite padrão de 2 MiB.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Toda rota do app abre o index.html guardado (SPA).
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.endsWith(".woff2"),
            handler: "CacheFirst",
            options: { cacheName: "fontes", expiration: { maxEntries: 40 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: { port: 5173 },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    env: { VITE_API_URL: "http://api.teste" },
  },
});
