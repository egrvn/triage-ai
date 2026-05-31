import { expect, test } from "@playwright/test";
import { createScenarioIncident, expectNoHorizontalScroll, login, resetDemo } from "./helpers";

test.describe("Incident filters", () => {
  test.beforeEach(async ({ request }) => {
    await resetDemo(request);
  });

  test("filter button opens panel, filters results, chips reset and Escape closes", async ({ page, request }) => {
    await createScenarioIncident(request, "release-regression-5xx");
    await createScenarioIncident(request, "low-confidence-sparse-data");
    await login(page);
    await page.goto("/incidents");

    const filterButton = page.getByRole("button", { name: "Открыть фильтры" });
    await expect(filterButton).toHaveAttribute("aria-expanded", "false");
    await filterButton.click();
    await expect(filterButton).toHaveAttribute("aria-expanded", "true");

    const filterPanel = page.locator(".incident-filter-panel__advanced");
    await expect(filterPanel).toBeVisible();
    await page.getByLabel("Критичность").selectOption("critical");
    await expect(page.getByText("Критичность: Критичный")).toBeVisible();
    await expect(page.locator(".incident-row")).toContainText("Критичный");

    await page.keyboard.press("Escape");
    await expect(filterButton).toHaveAttribute("aria-expanded", "false");
    await expect(filterPanel).toBeHidden();

    await page.getByRole("button", { name: /Сбросить/i }).first().click();
    await expect(page.getByText("Критичность: Критичный")).toHaveCount(0);
    await expectNoHorizontalScroll(page);
  });
});
