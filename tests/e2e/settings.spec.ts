import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, expectNoViewportOverflow, login, resetDemo } from "./helpers";

test.describe("Settings", () => {
  test.beforeEach(async ({ request }) => {
    await resetDemo(request);
  });

  test("role segmented control fills the selected segment", async ({ page }) => {
    await login(page);
    await page.goto("/settings");

    const group = page.getByRole("radiogroup", { name: /Роль по умолчанию/i });
    await expect(group).toBeVisible();

    const escalation = group.getByRole("radio", { name: "Эскалация" });
    await escalation.click();
    await expect(escalation).toHaveAttribute("aria-checked", "true");

    const box = await escalation.boundingBox();
    const color = await escalation.evaluate((element) => window.getComputedStyle(element).backgroundColor);
    expect(box?.width ?? 0).toBeGreaterThan(120);
    expect(color).not.toBe("rgba(0, 0, 0, 0)");

    await expectNoHorizontalScroll(page);
    await expectNoViewportOverflow(page);
  });
});
