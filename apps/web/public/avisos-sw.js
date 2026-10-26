/**
 * Avisos por push (ADR 0016). O service worker gerado pelo Workbox importa
 * este arquivo (`workbox.importScripts` no vite.config.ts). O servidor só
 * manda push para quem não está com o app aberto, então aqui sempre se mostra.
 */

self.addEventListener("push", (evento) => {
  let aviso = { title: "Compoze", body: "", url: "/", tag: "compoze" };
  try {
    aviso = { ...aviso, ...evento.data.json() };
  } catch {
    // Push sem corpo legível: mostra o aviso genérico.
  }
  evento.waitUntil(
    self.registration.showNotification(aviso.title, {
      body: aviso.body,
      tag: aviso.tag,
      // Mesma conversa: o aviso novo substitui o anterior, mas avisa de novo.
      renotify: true,
      icon: "/pwa-192.png",
      badge: "/pwa-192.png",
      lang: "pt-BR",
      data: { url: aviso.url },
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = new URL(evento.notification.data?.url ?? "/", self.location.origin).href;
  evento.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Já há uma janela do Compoze: leva ela até o aviso em vez de abrir outra.
      const aberta = janelas.find((j) => new URL(j.url).origin === self.location.origin);
      if (aberta) {
        await aberta.focus();
        await aberta.navigate(destino).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(destino);
    })(),
  );
});
