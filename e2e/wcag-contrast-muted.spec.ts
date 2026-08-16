import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
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
const userEmail = `e2e-wcag-contrast-${stamp}@test.local`;
const rejectedTitle = `Offre refusée assourdie ${stamp}`;

let userId: string;

test.beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: userEmail, passwordHash: hashPassword(PASSWORD) },
  });
  userId = user.id;

  await prisma.job.create({
    data: {
      userId,
      url: `https://example.com/e2e-wcag-rejected-${stamp}`,
      title: rejectedTitle,
      companyName: "Refuse Corp",
      status: "REJECTED",
    },
  });
});

test.afterAll(async () => {
  await prisma.job.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

async function loginAs(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/board");
}

test.describe("Contraste WCAG des traitements assourdis (E2E, JOB-104)", () => {
  test("colonne Refusé du board : le texte assourdi respecte le seuil AA", async ({ page }) => {
    await loginAs(page, userEmail);
    await page.goto("/board");
    const column = page.getByTestId("column-REJECTED");
    await expect(
      column.locator('[data-slot="card"]', { hasText: rejectedTitle })
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[data-testid="column-REJECTED"]')
      .withTags(["wcag2aa"])
      .analyze();

    const contrastViolations = results.violations.filter(
      (v) => v.id === "color-contrast"
    );
    expect(contrastViolations).toEqual([]);
  });
});
