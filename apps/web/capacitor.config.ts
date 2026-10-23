import type { CapacitorConfig } from "@capacitor/cli";

// App Android (Fase 3, ADR 0011): o mesmo apps/web, empacotado pelo Capacitor.
// O appId é a identidade do app no Android e não muda nunca mais: trocar faz
// o celular tratar como outro app, e as atualizações deixam de instalar.
const config: CapacitorConfig = {
  appId: "io.github.ryramx.compoze",
  appName: "Compoze",
  webDir: "dist",
  android: {
    // O app roda em https://localhost; a API libera essa origem no CORS.
    // Sem tráfego http: tudo vai para a API em https.
    allowMixedContent: false,
  },
};

export default config;
