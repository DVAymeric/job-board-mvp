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

async function loginAs(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.locator("form").getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/board");
}

/**
 * `waitForURL` ne prouve que la navigation client — pas que le cookie de
 * session a réellement été effacé côté navigateur. Sous forte contention
 * (suite E2E complète, 5 workers Playwright partageant un seul process
 * `next start`), le Set-Cookie de logoutAction peut être traité par le
 * navigateur après que `waitForURL` s'est déjà résolu, laissant une courte
 * fenêtre où /board reste accessible (JOB-131 — flake, jamais reproduit en
 * isolation ni via une requête HTTP directe, donc probablement un artefact
 * de contention du test plutôt qu'un vrai risque côté serveur). On attend
 * explicitement la disparition du cookie plutôt que de dépendre des retries
 * CI pour absorber la course.
 */
async function waitForSessionCookieCleared(page: import("@playwright/test").Page) {
  await expect
    .poll(async () => {
      const cookies = await page.context().cookies();
      return cookies.some((c) => c.name.includes("session-token"));
    })
    .toBe(false);
}

test.describe("Gestion de compte (E2E, JOB-79)", () => {
  test("le bouton de déconnexion termine la session", async ({ page }) => {
    const stamp = Date.now();
    const email = `e2e-logout-${stamp}@test.local`;
    const user = await prisma.user.create({
      data: { email, passwordHash: hashPassword(PASSWORD) },
    });

    try {
      await loginAs(page, email);
      await expect(page.getByRole("button", { name: "Se déconnecter" })).toBeVisible();

      await page.getByRole("button", { name: "Se déconnecter" }).click();
      await page.waitForURL("**/");
      await waitForSessionCookieCleared(page);

      await page.goto("/board");
      await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fboard/);
    } finally {
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  });

  test("supprimer mon compte efface le compte et toutes ses données (cascade), puis déconnecte", async ({
    page,
  }) => {
    const stamp = Date.now();
    const email = `e2e-delete-account-${stamp}@test.local`;
    const user = await prisma.user.create({
      data: { email, passwordHash: hashPassword(PASSWORD) },
    });
    const job = await prisma.job.create({
      data: {
        userId: user.id,
        url: `https://example.com/e2e-delete-account-${stamp}`,
        title: "Offre à effacer",
        status: "TO_APPLY",
      },
    });
    await prisma.contact.create({
      data: { jobId: job.id, userId: user.id, name: "Contact à effacer" },
    });
    await prisma.tag.create({ data: { userId: user.id, name: "tag-a-effacer" } });

    try {
      await loginAs(page, email);
      await page.goto("/account");
      await expect(page.getByText(email)).toBeVisible();

      await page.getByRole("button", { name: "Supprimer mon compte" }).click();
      await page
        .getByRole("button", { name: "Confirmer la suppression" })
        .click();

      await page.waitForURL("**/");
      await waitForSessionCookieCleared(page);

      // La session est bien terminée : /board redemande une connexion.
      await page.goto("/board");
      await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fboard/);

      // Le compte et toutes les données liées ont disparu de la base réelle
      // (preuve du cascade delete défini dans le schéma Prisma).
      const deletedUser = await prisma.user.findUnique({ where: { id: user.id } });
      const deletedJob = await prisma.job.findUnique({ where: { id: job.id } });
      const contacts = await prisma.contact.findMany({ where: { userId: user.id } });
      const tags = await prisma.tag.findMany({ where: { userId: user.id } });

      expect(deletedUser).toBeNull();
      expect(deletedJob).toBeNull();
      expect(contacts).toHaveLength(0);
      expect(tags).toHaveLength(0);
    } finally {
      // Filet de sécurité si l'assertion échoue avant la suppression réelle.
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
