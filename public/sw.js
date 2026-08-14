// Audit multi-tenant (JOB-126) : décision actée — garder le mode offline
// basique tel quel, sans le retirer ni le scoper par utilisateur. Le seul
// contenu jamais mis en cache est OFFLINE_URL, une page statique et
// générique sans donnée personnelle (public/offline.html). Le handler
// "fetch" ci-dessous ne cache jamais les pages authentifiées ni les
// réponses de Server Actions (uniquement les navigations passent par un
// network-first avec repli statique ; tout le reste va directement au
// réseau, jamais intercepté). Il n'existe donc structurellement aucun cache
// à invalider au changement de compte sur le même appareil — la question de
// scoping par utilisateur ne s'applique pas : il n'y a rien à scoper.
// Vérifié par e2e/offline-cache-safety.spec.ts (le Cache Storage ne contient
// jamais que OFFLINE_URL, même après navigation authentifiée).
const CACHE_NAME = "job-board-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

// Only navigations are intercepted: fall back to the offline page when the
// network is unreachable. Everything else (assets, Server Actions) goes
// straight to the network untouched.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then((response) => response ?? Response.error())
    )
  );
});
