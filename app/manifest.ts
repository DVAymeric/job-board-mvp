import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Suivi de candidatures",
    short_name: "Job Board",
    description: "Outil local de suivi de candidatures d'emploi",
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
