import { test, expect } from "@playwright/test";

test("home page loads and shows the hero and URL check bar", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "repostulez"
  );
  await expect(
    page.getByPlaceholder("Colle l'URL de l'offre d'emploi ici...")
  ).toBeVisible();
});

test("unauthenticated access to /board redirects to /login", async ({ page }) => {
  await page.goto("/board");

  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fboard/);
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
});
