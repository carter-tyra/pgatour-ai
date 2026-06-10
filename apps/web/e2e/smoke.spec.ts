import { expect, type Page, test } from "@playwright/test";

async function openSection(page: Page, name: string) {
  const sidebarButton = page.getByRole("button", { name }).first();

  if (await sidebarButton.isVisible()) {
    await sidebarButton.click();
    await expect(sidebarButton).toHaveAttribute("aria-current", "page");
    return;
  }

  const tab = page.getByRole("tab", { name });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

test("terminal tabs and market filters work", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "PGA Tour AI" })).toBeVisible();
  await expect(page.getByText("Market Mispricing Board")).toBeVisible();

  for (const tab of ["Research", "Fantasy", "Live", "Portfolio", "AI Analyst", "Betting"]) {
    await openSection(page, tab);
  }

  await expect(page.getByText("Featured Edge")).toBeVisible();

  await page.getByRole("button", { name: "Outright" }).click();

  await expect(page.getByText("Market Mispricing Board")).toBeVisible();
  await expect(page.getByRole("button", { name: "Outright" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
