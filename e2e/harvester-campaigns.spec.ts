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
const SLUG = `alternance-data-e2e-${stamp}`;

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
    await page.getByLabel("Identifiant").fill(SLUG);
    await page.getByLabel("Codes ROME").fill("M1403, M1805");
    await page.getByLabel("Mots-clés").fill("data analyst");
    await page.getByRole("checkbox", { name: "Apprentissage" }).check();
    await page.getByLabel("Libellé").fill("Lille 59000");
    await page.getByLabel("Latitude").fill("50.630951");
    await page.getByLabel("Longitude").fill("3.045391");
    await page.getByRole("button", { name: "Créer la campagne" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText(SLUG)).toBeVisible();

    const stored = await prisma.campaign.findFirst({ where: { userId, slug: SLUG } });
    expect(stored).not.toBeNull();
    expect(stored?.romeCodes).toEqual(["M1403", "M1805"]);
    expect(stored?.contractTypes).toEqual(["APPRENTISSAGE"]);

    await page.getByText(SLUG).click();
    await expect(page.getByRole("heading", { name: "Modifier la campagne" })).toBeVisible();
    await page.getByRole("checkbox", { name: "Professionnalisation" }).check();
    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    const updated = await prisma.campaign.findUnique({ where: { id: stored!.id } });
    expect(updated?.contractTypes).toEqual(["APPRENTISSAGE", "PROFESSIONNALISATION"]);

    await page.getByText(SLUG).click();
    await page.getByRole("button", { name: "Supprimer" }).click();
    await page.getByRole("button", { name: "Confirmer la suppression" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("button", { name: new RegExp(SLUG) })).toBeHidden();
    await expect
      .poll(async () => prisma.campaign.findUnique({ where: { id: stored!.id } }))
      .toBeNull();
  });
});
