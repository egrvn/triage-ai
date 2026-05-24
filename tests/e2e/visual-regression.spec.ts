import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createIncident, expectNoHorizontalScroll, login } from "./helpers";

const screenshotRoutes = [
  { name: "dashboard", route: "/dashboard", protected: true },
  { name: "incidents", route: "/incidents", protected: true },
  { name: "integrations", route: "/integrations", protected: true },
  { name: "docs", route: "/docs", protected: false }
];

const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "desktop", width: 1440, height: 900 }
];

test.describe("visual screenshot smoke", () => {
  test.beforeAll(() => {
    mkdirSync("test-results/visual-snapshots", { recursive: true });
  });

  for (const viewport of viewports) {
    test(`captures stable screenshots at ${viewport.name}`, async ({ page, request }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await createIncident(request);

      for (const item of screenshotRoutes) {
        if (item.protected) {
          await login(page);
        }
        await page.goto(item.route);
        await page.addStyleTag({
          content: "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}"
        });
        await expect(page.locator("body")).toBeVisible();
        await expectNoHorizontalScroll(page);
        await page.screenshot({
          path: `test-results/visual-snapshots/${item.name}-${viewport.name}.png`,
          fullPage: true
        });
      }
    });
  }
});
