/* Service worker minimal : permet d'installer Nhova sur l'écran d'accueil. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
