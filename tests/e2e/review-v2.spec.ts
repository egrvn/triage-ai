import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, expectNoViewportOverflow, login, resetDemo } from "./helpers";

test.describe("Review v2 product gaps", () => {
  test.beforeEach(async ({ request }) => {
    await resetDemo(request);
  });

  test("landing communicates measurable value, Generic ingest and AI boundaries", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText(/5–15 минут до гипотезы/i)).toBeVisible();
    await expect(page.getByText(/1–2 перехода вместо 5–8 инструментов/i)).toBeVisible();
    await expect(page.getByText(/AI помогает, но не действует автономно/i)).toBeVisible();
    await expect(page.getByText("Generic ingest").first()).toBeVisible();
    await expect(page.getByText("Time to Hypothesis", { exact: true })).toBeVisible();
    await expect(page.getByText(/Чем Triage AI полезен рядом с Datadog/i)).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoViewportOverflow(page);
  });

  test("dashboard onboarding hidden state persists", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: /Как пользоваться Triage AI/i })).toBeVisible();
    await page.getByRole("button", { name: /Скрыть инструкцию/i }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: /Показать инструкцию/i })).toBeVisible();
    const hidden = await page.evaluate(() => localStorage.getItem("triage-ai-onboarding-hidden"));
    expect(hidden).toBe("true");
  });

  test("integrations, docs and roadmap expose Generic ingest and proactive track", async ({ page }) => {
    await login(page);

    await page.goto("/integrations");
    await expect(page.getByRole("heading", { name: /Единая точка входа/i })).toBeVisible();
    await expect(page.locator(".integration-logo-grid").getByText("Zabbix", { exact: true })).toBeVisible();
    await expect(page.locator(".integration-logo-grid").getByText("Victoria Metrics", { exact: true })).toBeVisible();
    await expect(page.locator(".integration-logo-grid").getByText("OpenSearch", { exact: true })).toBeVisible();
    await expect(page.getByText("PII masking", { exact: true })).toBeVisible();

    await page.goto("/app/docs");
    await expect(page.getByRole("heading", { name: "Proactive vs Reactive flow" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Generic ingest", level: 2 })).toBeVisible();
    await expect(page.getByText(/Зачем AI, если уже есть observability tools/i)).toBeVisible();

    await page.goto("/roadmap");
    await expect(page.getByText("Proactive prevention")).toBeVisible();
    await expect(page.getByText("Knowledge base / Custom context")).toBeVisible();
    await expect(page.getByText("PII masking")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
