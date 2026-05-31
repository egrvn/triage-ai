import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, login, resetDemo } from "./helpers";

test.describe("Dashboard service review", () => {
  test.beforeEach(async ({ request }) => {
    await resetDemo(request);
  });

  test("onboarding hidden state persists and dashboard counters stay in main content", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: /Как пользоваться Triage AI/i })).toBeVisible();
    await page.getByRole("button", { name: /Скрыть инструкцию/i }).click();
    await page.reload();

    await expect(page.getByRole("button", { name: /Показать инструкцию/i })).toBeVisible();
    await expect(page.getByTestId("dashboard-summary-metrics")).toBeVisible();
    await expect(page.getByTestId("sidebar-metrics")).toHaveCount(0);
    await expect(page.locator(".sidebar-status-counters")).toContainText("В работе");

    const hidden = await page.evaluate(() => localStorage.getItem("triage-ai-onboarding-hidden"));
    expect(hidden).toBe("true");
    await expectNoHorizontalScroll(page);
  });

  test("incident dynamics uses baseline chart instead of broken empty state", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");

    await expect(page.getByText("Динамика пока не построена")).toHaveCount(0);
    await expect(page.locator(".incident-chart").first()).toBeVisible();
    await expect(page.getByText(/Baseline для демо-режима|Краткая динамика/i).first()).toBeVisible();

    await page.getByRole("button", { name: /Запустить сценарий Регрессия после релиза/i }).click();
    await expect(page).toHaveURL(/\/incidents\/inc-/);
  });
});
