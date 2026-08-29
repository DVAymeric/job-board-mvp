import { test, expect, type Page } from "@playwright/test";
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
const userEmail = `e2e-harvester-campaigns-${stamp}@test.local`;

let userId: string;

test.beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: userEmail, passwordHash: hashPassword(PASSWORD) },
  });
  userId = user.id;
});

test.afterAll(async () => {
  await prisma.campaign.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.locator("form").getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/board");
}

test.describe("Campagnes Harvester (E2E, JOB-50)", () => {
  test("crée, modifie puis supprime une campagne de bout en bout", async ({ page }) => {
    await loginAs(page, userEmail);
    await page.goto("/harvester/campaigns");

    await page.getByRole("button", { name: "Nouvelle campagne" }).click();
    await page.getByLabel("Mots-clés").fill("data analyst");
    await page.getByRole("checkbox", { name: "Apprentissage" }).check();
    await page.getByLabel("Ville").fill("Lille");
    await page.getByLabel("Rayon (km)").fill("30");
    await page.getByRole("button", { name: "Créer la campagne" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();

    // JOB-59 (suite) : l'identifiant n'est plus saisi, il est dérivé des mots-clés côté serveur —
    // on retrouve la campagne créée par son unique appartenance à cet utilisateur de test.
    const stored = await prisma.campaign.findFirst({ where: { userId } });
    expect(stored).not.toBeNull();
    expect(stored?.contractTypes).toEqual(["APPRENTISSAGE"]);
    const config = stored?.config as { locations?: { label: string; lat: number; lng: number }[] };
    expect(config.locations?.[0]?.label).toContain("Lille");
    expect(config.locations?.[0]?.lat).toBeCloseTo(50.63, 0);
    expect(config.locations?.[0]?.lng).toBeCloseTo(3.06, 0);

    await expect(page.getByText(stored!.slug)).toBeVisible();
    await page.getByText(stored!.slug).click();
    await expect(page.getByRole("heading", { name: "Modifier la campagne" })).toBeVisible();
    await page.getByRole("checkbox", { name: "Professionnalisation" }).check();
    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    const updated = await prisma.campaign.findUnique({ where: { id: stored!.id } });
    expect(updated?.contractTypes).toEqual(["APPRENTISSAGE", "PROFESSIONNALISATION"]);
    expect(updated?.slug).toBe(stored!.slug);

    await page.getByText(stored!.slug).click();
    await page.getByRole("button", { name: "Supprimer" }).click();
    await page.getByRole("button", { name: "Confirmer la suppression" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("button", { name: new RegExp(stored!.slug) })).toBeHidden();
    await expect
      .poll(async () => prisma.campaign.findUnique({ where: { id: stored!.id } }))
      .toBeNull();
  });
});
