import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import {
  createIncident,
  expectCriticalBlocksNotClipped,
  expectNoHorizontalScroll,
  expectNoViewportOverflow,
  login
} from "./helpers";

const viewports = [
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1920", width: 1920, height: 1080 }
];

async function installVisualGuards(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
      }
    `
  });
}

async function assertLayout(page: Page) {
  await expectNoHorizontalScroll(page);
  await expectNoViewportOverflow(page);
  await expectCriticalBlocksNotClipped(page);
}

test.describe("visual layout QA", () => {
  test.beforeAll(() => {
    mkdirSync("test-results/visual-snapshots", { recursive: true });
  });

  for (const viewport of viewports) {
    test(`public and app pages do not overflow at ${viewport.width}x${viewport.height}`, async ({ page, request }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const incidentId = await createIncident(request);

      const publicRoutes = ["/", "/login", "/docs"];
      for (const route of publicRoutes) {
        await page.goto(route);
        await installVisualGuards(page);
        await expect(page.locator("body")).toBeVisible();
        await assertLayout(page);
        await page.screenshot({
          path: `test-results/visual-snapshots/${route === "/" ? "landing" : route.slice(1)}-${viewport.name}.png`,
          fullPage: true
        });
      }

      await login(page);
      const appRoutes = ["/dashboard", "/incidents", `/incidents/${incidentId}`, "/integrations", "/app/docs", "/settings"];
      for (const route of appRoutes) {
        await page.goto(route);
        await installVisualGuards(page);
        await expect(page.locator(".workspace")).toBeVisible();
        await assertLayout(page);
        await page.screenshot({
          path: `test-results/visual-snapshots/${route.replaceAll("/", "-").replace(/^-/, "")}-${viewport.name}.png`,
          fullPage: true
        });
      }
    });
  }
});
