import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "@fontsource-variable/hanken-grotesk/wght.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { conferirAtualizacao } from "./lib/atualizacao";
import { iniciarMemos } from "./lib/memos";
import { iniciarNativo } from "./lib/nativo";
import { registrarServiceWorker } from "./lib/pwa";
import { iniciarTema } from "./lib/tema";

iniciarTema();
registrarServiceWorker();
iniciarNativo();
conferirAtualizacao();
iniciarMemos();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
