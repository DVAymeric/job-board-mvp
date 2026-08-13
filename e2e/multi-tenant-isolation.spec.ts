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
const userAEmail = `e2e-iso-a-${stamp}@test.local`;
const userBEmail = `e2e-iso-b-${stamp}@test.local`;
const jobATitle = `Offre confidentielle de A ${stamp}`;
const jobAUrl = `https://example.com/e2e-isolation-${stamp}`;

let userAId: string;
let userBId: string;

test.beforeAll(async () => {
  const userA = await prisma.user.create({
    data: { email: userAEmail, passwordHash: hashPassword(PASSWORD) },
  });
  const userB = await prisma.user.create({
    data: { email: userBEmail, passwordHash: hashPassword(PASSWORD) },
  });
  userAId = userA.id;
  userBId = userB.id;

  await prisma.job.create({
    data: {
      userId: userAId,
      url: jobAUrl,
      title: jobATitle,
      status: "TO_APPLY",
    },
  });
});

test.afterAll(async () => {
  await prisma.job.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
  await prisma.$disconnect();
});

async function loginAs(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/board");
}

test.describe("Isolation multi-tenant (E2E, JOB-72)", () => {
  test("B ne voit jamais l'offre de A dans le board", async ({ page }) => {
    await loginAs(page, userBEmail);
    await expect(page.getByText(jobATitle)).toHaveCount(0);
  });

  test("B ne voit jamais l'offre de A dans les archives", async ({ page }) => {
    await loginAs(page, userBEmail);
    await page.goto("/archives");
    await expect(page.getByText(jobATitle)).toHaveCount(0);
  });

  test("B ne voit pas l'offre de A dans son export CSV", async ({ page }) => {
    await loginAs(page, userBEmail);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Exporter CSV" }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    if (stream) {
      for await (const chunk of stream) chunks.push(chunk as Buffer);
    }
    const csvContent = Buffer.concat(chunks).toString("utf-8");
    expect(csvContent).not.toContain(jobATitle);
    expect(csvContent).not.toContain(jobAUrl);
  });

  test("A voit bien sa propre offre (contrôle positif)", async ({ page }) => {
    await loginAs(page, userAEmail);
    await expect(page.getByText(jobATitle)).toBeVisible();
  });
});
