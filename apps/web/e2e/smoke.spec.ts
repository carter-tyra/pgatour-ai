import { expect, test } from "@playwright/test";

test("terminal tabs and market filters work", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "PGA Tour AI" })).toBeVisible();
  await expect(page.getByText("Market Mispricing Board")).toBeVisible();

  for (const tab of ["Research", "Fantasy", "Live", "Portfolio", "AI Analyst", "Betting"]) {
    await page.getByRole("button", { name: tab }).click();
    await expect(page.getByRole("button", { name: tab })).toHaveAttribute("aria-pressed", "true");
  }

  await expect(page.getByText("Bet Thesis")).toBeVisible();

  await page.getByRole("button", { name: "Outright" }).click();

  await expect(page.getByText("Market Mispricing Board")).toBeVisible();
  await expect(page.getByRole("button", { name: "Outright" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
