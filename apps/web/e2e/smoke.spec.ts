import { expect, test } from "@playwright/test";

test("terminal tabs and market filters work", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "PGA Tour AI" })).toBeVisible();
  await expect(page.getByText("Market Mispricing Board")).toBeVisible();

  for (const tab of ["Research", "Fantasy", "Live", "Portfolio", "AI Analyst", "Betting"]) {
    await page.getByRole("button", { name: tab }).click();
  }

  await page.getByRole("button", { name: "Outright" }).click();

  await expect(page.getByText("Bet Thesis")).toBeVisible();
  await expect(page.getByText("Market Mispricing Board")).toBeVisible();
  await expect(page.getByRole("button", { name: "Outright" })).toHaveClass(/bg-zinc-950/);
});
