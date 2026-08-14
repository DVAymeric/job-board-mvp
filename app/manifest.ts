import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Suivi de candidatures",
    short_name: "Job Board",
    description:
      "Suivez vos candidatures d'emploi en un board : statuts, relances, historique. Gratuit, prêt en 2 minutes.",
    // Protégé par proxy.ts (JOB-78) : un utilisateur non connecté qui lance
    // la PWA est redirigé vers /login comme en navigation classique — le
    // service worker (public/sw.js) ne fait qu'un fallback offline
    // network-first sur les navigations, il n'intercepte/ne cache jamais
    // /board lui-même (JOB-125, vérifié en navigateur).
    start_url: "/board",
    display: "standalone",
    background_color: "#f8f6fb",
    theme_color: "#4f1271",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
