import { createServer, type Server } from "node:http";

const FIXTURE_HTML = {
  staticTitle: `<html><head><meta property="og:title" content="Développeur Backend — Fixture" /></head><body></body></html>`,
  noMetadata: `<html><head></head><body><p>Rien à voir ici.</p></body></html>`,
  jsTitle: `<html><head></head><body><script>document.title = "Titre Rendu par JS — Fixture";</script></body></html>`,
};

export type FixtureServer = {
  url: string;
  close: () => Promise<void>;
};

/**
 * Serveur HTTP minimal servant des pages de fixture pour la suite E2E du
 * scraper (JOB-69) : titre statique, absence de metadata, titre rendu par
 * JS (déclenche le fallback Playwright), 403, et une route qui ne répond
 * jamais (simule un timeout). Écoute sur 127.0.0.1 : n'est atteignable que
 * grâce à l'escape hatch ALLOW_LOOPBACK_FETCH_FOR_TESTS (lib/url.ts).
 */
export function startFixtureServer(): Promise<FixtureServer> {
  return new Promise((resolve, reject) => {
    const server: Server = createServer((req, res) => {
      const path = (req.url ?? "/").split("?")[0];
      switch (path) {
        case "/static-title":
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(FIXTURE_HTML.staticTitle);
          return;
        case "/no-metadata":
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(FIXTURE_HTML.noMetadata);
          return;
        case "/js-title":
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(FIXTURE_HTML.jsTitle);
          return;
        case "/forbidden":
          res.writeHead(403, { "Content-Type": "text/plain" });
          res.end("Forbidden");
          return;
        case "/hangs":
          // Ne répond jamais : exerce le comportement de timeout du scraper.
          return;
        default:
          res.writeHead(404);
          res.end();
      }
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Impossible de démarrer le serveur de fixtures"));
        return;
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise<void>((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
  });
}
