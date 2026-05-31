import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, expectNoViewportOverflow, login, resetDemo } from "./helpers";

test.describe("Roadmap", () => {
  test.beforeEach(async ({ request }) => {
    await resetDemo(request);
  });

  test("settings roadmap button opens product roadmap page", async ({ page }) => {
    await login(page);
    await page.goto("/settings");

    await page.getByRole("link", { name: /В roadmap/i }).click();
    await expect(page).toHaveURL(/\/roadmap$/);
    await expect(page.getByRole("heading", { name: "Roadmap продукта" })).toBeVisible();
    await expect(page.getByText("Реальные источники данных")).toBeVisible();
    await expect(page.getByText("Proactive prevention")).toBeVisible();
    await expect(page.getByText("Knowledge base / Custom context")).toBeVisible();
    await expect(page.getByText("PII masking")).toBeVisible();
    await expect(page.getByText("Victoria Metrics")).toBeVisible();
    await expect(page.getByText("LLM providers")).toBeVisible();
    await expect(page.getByText("Готовность к production")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoViewportOverflow(page);
  });
});
