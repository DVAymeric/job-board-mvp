import { test, expect, type Page } from "@playwright/test";
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
const userEmail = `e2e-board-critical-path-${stamp}@test.local`;
const URL_PLACEHOLDER = "Colle l'URL de l'offre d'emploi ici...";
const ORIGINAL_TITLE = "Développeur Backend — Fixture";
const UPDATED_TITLE = `${ORIGINAL_TITLE} (modifié)`;
const UPDATED_COMPANY = "Acme Corp";

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

async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/board");
}

/**
 * dnd-kit's PointerSensor only starts a drag once the pointer has moved past
 * an 8px activation distance (see components/board/board.tsx). A plain
 * `dragTo()` can resolve before the browser has dispatched enough pointermove
 * events, so the drag is scripted manually with an intermediate move.
 */
async function dragCardToColumn(page: Page, cardTitle: string, columnTestId: string) {
  const card = page.locator('[data-slot="card"]', { hasText: cardTitle });
  const target = page.getByTestId(columnTestId);
  const sourceBox = await card.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Impossible de mesurer la carte ou la colonne cible");

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2 + 20,
    sourceBox.y + sourceBox.height / 2 + 20,
    { steps: 5 }
  );
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 10 }
  );
  await page.mouse.up();
}

test.describe("Parcours critique du board (E2E, JOB-70)", () => {
  test("coller une URL → auto-création → drag & drop → édition → archivage → désarchivage → suppression", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await loginAs(page, userEmail);

    // 1. Coller une URL sur la page d'accueil → auto-création de la candidature.
    await page.goto("/");
    await page.getByPlaceholder(URL_PLACEHOLDER).fill(`${fixtureServer.url}/static-title`);
    await page.getByPlaceholder(URL_PLACEHOLDER).press("Enter");
    const createdCard = page.getByTestId("created-job-card");
    await expect(createdCard).toBeVisible({ timeout: 15_000 });
    await expect(createdCard).toContainText(ORIGINAL_TITLE);

    // 2. La candidature apparaît dans la colonne "À postuler" du board.
    await page.goto("/board");
    const toApplyColumn = page.getByTestId("column-TO_APPLY");
    await expect(
      toApplyColumn.locator('[data-slot="card"]', { hasText: ORIGINAL_TITLE })
    ).toBeVisible();
    // La carte est déjà dans le HTML rendu côté serveur, mais dnd-kit
    // n'attache ses listeners de pointeur qu'après l'hydratation React :
    // sans cette attente, le drag ci-dessous peut démarrer avant qu'ils ne
    // soient posés (observé de façon intermittente contre un build de
    // production, plus rapide à afficher que le JS n'est prêt).
    await page.waitForLoadState("networkidle");

    // 3. Drag & drop vers la colonne "Postulé".
    await dragCardToColumn(page, ORIGINAL_TITLE, "column-APPLIED");
    const appliedColumn = page.getByTestId("column-APPLIED");
    await expect(
      appliedColumn.locator('[data-slot="card"]', { hasText: ORIGINAL_TITLE })
    ).toBeVisible();
    await expect(
      toApplyColumn.locator('[data-slot="card"]', { hasText: ORIGINAL_TITLE })
    ).toHaveCount(0);

    // Le changement de statut est bien persisté côté serveur (pas seulement
    // une mise à jour optimiste côté client).
    await page.reload();
    await expect(
      page.getByTestId("column-APPLIED").locator('[data-slot="card"]', { hasText: ORIGINAL_TITLE })
    ).toBeVisible();

    // 4. Édition : ouvrir la carte, modifier titre et entreprise.
    await page.getByTestId("column-APPLIED").getByText(ORIGINAL_TITLE).click();
    await expect(page.getByLabel("Titre du poste")).toBeVisible();
    await page.getByLabel("Titre du poste").fill(UPDATED_TITLE);
    await page.getByLabel("Entreprise").fill(UPDATED_COMPANY);
    await page
      .locator("#job-company")
      .locator("..")
      .getByRole("button", { name: "Enregistrer" })
      .click();
    await expect(page.getByText("Offre mise à jour")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByTestId("column-APPLIED").locator('[data-slot="card"]', { hasText: UPDATED_TITLE })
    ).toBeVisible();

    // 5. Archivage depuis la fiche détaillée.
    await page.getByTestId("column-APPLIED").getByText(UPDATED_TITLE).click();
    await page.getByRole("button", { name: "Archiver" }).click();
    await page.getByRole("button", { name: "Confirmer l'archivage" }).click();
    await expect(page.getByText("Candidature archivée")).toBeVisible();
    await expect(
      page.locator('[data-slot="card"]', { hasText: UPDATED_TITLE })
    ).toHaveCount(0);

    // 6. La candidature archivée apparaît dans /archives avec son titre à jour.
    await page.goto("/archives");
    await expect(page.getByText(UPDATED_TITLE)).toBeVisible();

    // 7. Désarchivage.
    await page
      .locator('[data-slot="card"]', { hasText: UPDATED_TITLE })
      .getByRole("button", { name: "Désarchiver" })
      .click();
    await expect(page.getByText("Candidature désarchivée")).toBeVisible();
    await expect(page.getByText(UPDATED_TITLE)).toHaveCount(0);

    // 8. De retour sur le board.
    await page.goto("/board");
    const restoredCard = page.locator('[data-slot="card"]', { hasText: UPDATED_TITLE });
    await expect(restoredCard).toBeVisible();

    // 9. Suppression définitive via l'action rapide au survol de la carte.
    await restoredCard.hover();
    await restoredCard
      .getByRole("button", { name: "Supprimer définitivement" })
      .click();
    await page
      .getByRole("button", { name: "Confirmer la suppression" })
      .click();
    await expect(page.getByText("Candidature supprimée")).toBeVisible();
    await expect(
      page.locator('[data-slot="card"]', { hasText: UPDATED_TITLE })
    ).toHaveCount(0);

    const remainingJobs = await prisma.job.findMany({ where: { userId } });
    expect(remainingJobs).toHaveLength(0);
  });
});
