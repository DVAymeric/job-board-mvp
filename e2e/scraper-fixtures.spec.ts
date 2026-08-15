import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";
import { startFixtureServer, type FixtureServer } from "./fixtures/scraper-fixture-server";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

const PASSWORD = "correct-horse-battery-staple";
const stamp = Date.now();
const userEmail = `e2e-scraper-fixtures-${stamp}@test.local`;
const URL_PLACEHOLDER = "Colle l'URL de l'offre d'emploi ici...";

let userId: string;
let fixtureServer: FixtureServer;

test.beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: userEmail, passwordHash: hashPassword(PASSWORD) },
  });
  userId = user.id;
  fixtureServer = await startFixtureServer();
});

test.afterAll(async () => {
  await prisma.job.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
  await fixtureServer.close();
});

async function loginAs(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/board");
}

test.describe("Scraper contre des fixtures HTML contrôlées (E2E, JOB-69)", () => {
  // Exécution en série (JOB-ASYNC-ENRICH) : l'enrichissement tourne
  // désormais en tâche de fond après la réponse de createJob, ce qui inclut
  // de vrais lancements de Chromium headless (fallback Playwright) pour
  // plusieurs de ces tests. En parallèle, ces lancements se disputent le
  // CPU et font largement dépasser les délais d'attente.
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    // Un même utilisateur partagé entre tous les tests de ce describe
    // (exécutés en série) : sans nettoyage, les candidatures FAILED
    // s'accumulent sur le board d'un test à l'autre et les locators par
    // texte ("Titre non détecté...") deviennent ambigus.
    await prisma.job.deleteMany({ where: { userId } });
    await loginAs(page, userEmail);
    await page.goto("/");
  });

  test("HTML statique avec og:title : création immédiate, titre enrichi en tâche de fond", async ({
    page,
  }) => {
    await page.getByPlaceholder(URL_PLACEHOLDER).fill(`${fixtureServer.url}/static-title`);
    await page.getByPlaceholder(URL_PLACEHOLDER).press("Enter");

    // La candidature apparaît quasi instantanément, sans attendre le
    // scraping (JOB-ASYNC-ENRICH), avant même que le titre ne soit connu.
    await expect(page.getByText("Candidature enregistrée")).toBeVisible({ timeout: 5_000 });

    // Le titre se résout ensuite en tâche de fond et apparaît sur le board.
    await page.goto("/board");
    const boardCard = page.locator('[data-slot="card"]', {
      hasText: "Développeur Backend — Fixture",
    });
    await expect(boardCard).toBeVisible({ timeout: 15_000 });
  });

  test("HTML sans metadata : la carte reste visible, invite à renseigner le titre manuellement", async ({
    page,
  }) => {
    await page.getByPlaceholder(URL_PLACEHOLDER).fill(`${fixtureServer.url}/no-metadata`);
    await page.getByPlaceholder(URL_PLACEHOLDER).press("Enter");

    await expect(page.getByText("Candidature enregistrée")).toBeVisible({ timeout: 5_000 });

    // Pas de titre exploitable via Cheerio : le fallback Playwright est
    // aussi tenté avant d'abandonner (lib/scraper/index.ts) — le scraping
    // échoue à trouver un titre, mais la candidature reste dans le board
    // (pas de perte de la candidature) avec un état FAILED explicite.
    test.setTimeout(60_000);
    await page.goto("/board");
    await expect(
      page.getByText("Titre non détecté — cliquer pour renseigner manuellement")
    ).toBeVisible({ timeout: 45_000 });
  });

  test("titre rendu par JS : fallback Playwright déclenché, titre enrichi en tâche de fond", async ({
    page,
  }) => {
    await page.getByPlaceholder(URL_PLACEHOLDER).fill(`${fixtureServer.url}/js-title`);
    await page.getByPlaceholder(URL_PLACEHOLDER).press("Enter");

    await expect(page.getByText("Candidature enregistrée")).toBeVisible({ timeout: 5_000 });

    test.setTimeout(60_000);
    await page.goto("/board");
    const boardCard = page.locator('[data-slot="card"]', {
      hasText: "Titre Rendu par JS — Fixture",
    });
    await expect(boardCard).toBeVisible({ timeout: 45_000 });
  });

  test("réponse 403 : la carte reste visible, invite à renseigner le titre manuellement", async ({
    page,
  }) => {
    await page.getByPlaceholder(URL_PLACEHOLDER).fill(`${fixtureServer.url}/forbidden`);
    await page.getByPlaceholder(URL_PLACEHOLDER).press("Enter");

    await expect(page.getByText("Candidature enregistrée")).toBeVisible({ timeout: 5_000 });

    test.setTimeout(60_000);
    await page.goto("/board");
    await expect(
      page.getByText("Titre non détecté — cliquer pour renseigner manuellement")
    ).toBeVisible({ timeout: 45_000 });
  });

  test("page qui ne répond jamais (timeout) : la carte reste visible, invite à renseigner le titre manuellement", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.getByPlaceholder(URL_PLACEHOLDER).fill(`${fixtureServer.url}/hangs`);
    await page.getByPlaceholder(URL_PLACEHOLDER).press("Enter");

    await expect(page.getByText("Candidature enregistrée")).toBeVisible({ timeout: 5_000 });

    await page.goto("/board");
    await expect(
      page.getByText("Titre non détecté — cliquer pour renseigner manuellement")
    ).toBeVisible({ timeout: 75_000 });
  });
});
