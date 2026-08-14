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
  test.beforeEach(async ({ page }) => {
    await loginAs(page, userEmail);
    await page.goto("/");
  });

  test("HTML statique avec og:title : création automatique de la candidature", async ({
    page,
  }) => {
    await page.getByPlaceholder(URL_PLACEHOLDER).fill(`${fixtureServer.url}/static-title`);
    await page.getByPlaceholder(URL_PLACEHOLDER).press("Enter");

    const card = page.getByTestId("created-job-card");
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card).toContainText("Développeur Backend — Fixture");
  });

  test("HTML sans metadata : bascule sur le formulaire manuel", async ({ page }) => {
    await page.getByPlaceholder(URL_PLACEHOLDER).fill(`${fixtureServer.url}/no-metadata`);
    await page.getByPlaceholder(URL_PLACEHOLDER).press("Enter");

    await expect(page.getByTestId("fallback-job-card")).toBeVisible({ timeout: 15_000 });
  });

  test("titre rendu par JS : fallback Playwright déclenché, création automatique", async ({
    page,
  }) => {
    await page.getByPlaceholder(URL_PLACEHOLDER).fill(`${fixtureServer.url}/js-title`);
    await page.getByPlaceholder(URL_PLACEHOLDER).press("Enter");

    const card = page.getByTestId("created-job-card");
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(card).toContainText("Titre Rendu par JS — Fixture");
  });

  test("réponse 403 : bascule sur le formulaire manuel", async ({ page }) => {
    await page.getByPlaceholder(URL_PLACEHOLDER).fill(`${fixtureServer.url}/forbidden`);
    await page.getByPlaceholder(URL_PLACEHOLDER).press("Enter");

    await expect(page.getByTestId("fallback-job-card")).toBeVisible({ timeout: 15_000 });
  });

  test("page qui ne répond jamais (timeout) : bascule sur le formulaire manuel", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.getByPlaceholder(URL_PLACEHOLDER).fill(`${fixtureServer.url}/hangs`);
    await page.getByPlaceholder(URL_PLACEHOLDER).press("Enter");

    await expect(page.getByTestId("fallback-job-card")).toBeVisible({ timeout: 45_000 });
  });
});
