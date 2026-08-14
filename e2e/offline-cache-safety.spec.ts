import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

const PASSWORD = "correct-horse-battery-staple";
const stamp = Date.now();
const userEmail = `e2e-offline-cache-${stamp}@test.local`;

let userId: string;

test.beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: userEmail, passwordHash: hashPassword(PASSWORD) },
  });
  userId = user.id;
  await prisma.job.create({
    data: {
      userId,
      url: `https://example.com/e2e-offline-cache-${stamp}`,
      title: "Offre sensible à ne jamais mettre en cache",
      status: "TO_APPLY",
    },
  });
});

test.afterAll(async () => {
  await prisma.job.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

/**
 * Audit JOB-126 : public/sw.js ne doit jamais mettre en cache une page
 * authentifiée ou des données de candidature — seul le fallback offline
 * statique et générique (public/offline.html, aucune donnée utilisateur)
 * peut s'y trouver. C'est la propriété qui rend le mode offline sûr en
 * contexte multi-tenant (pas de risque de voir les données d'un compte
 * précédent après changement d'utilisateur sur le même appareil, puisqu'il
 * n'y a jamais de donnée personnelle en cache pour commencer).
 */
test("le cache du service worker ne contient jamais que le fallback offline statique", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(userEmail);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/board");
  await expect(page.getByText("Offre sensible à ne jamais mettre en cache")).toBeVisible();

  await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true));

  const cachedPaths = await page.evaluate(async () => {
    const cacheNames = await caches.keys();
    const paths: string[] = [];
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      paths.push(...requests.map((r) => new URL(r.url).pathname));
    }
    return paths;
  });

  expect(cachedPaths).toEqual(["/offline.html"]);
});
