import { expect, test } from "@playwright/test";
import { createIncident, expectNoHorizontalScroll, login, resetDemo } from "./helpers";

test.describe("Incident workspace service review", () => {
  test.beforeEach(async ({ request }) => {
    await resetDemo(request);
  });

  test("actions are grouped, deploy correlation is prioritized, explainability is visible", async ({ page, request }) => {
    const incidentId = await createIncident(request);
    await login(page);
    await page.goto(`/incidents/${incidentId}`);

    await expect(page.getByText("Основные действия")).toBeVisible();
    await expect(page.getByText("Гипотеза и передача контекста")).toBeVisible();
    await expect(page.getByRole("button", { name: /Принять в работу/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Нужно больше данных/i })).toBeVisible();

    const deployBlock = page.locator(".deploy-correlation-callout");
    await expect(deployBlock).toContainText("Связь с развертыванием");
    await expect(deployBlock).toContainText("Сильный сигнал");
    await expect(deployBlock).toContainText("feat/retry-logic-v2");

    await expect(page.getByText("Почему система так считает")).toBeVisible();
    await expect(page.locator(".explainability-citations button").first()).toBeVisible();
    await expect(page.getByText("Контр-сигналы")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("partial hypothesis feedback creates visible event", async ({ page, request }) => {
    const incidentId = await createIncident(request);
    await login(page);
    await page.goto(`/incidents/${incidentId}`);

    await page.getByRole("button", { name: /Нужно больше данных/i }).click();
    await expect(page.getByText("Отмечено: требуется дополнительная проверка").first()).toBeVisible();
    await expect(page.locator(".incident-timeline-list")).toContainText("Отмечено: нужно больше данных");

    await page.reload();
    await expect(page.locator(".incident-timeline-list")).toContainText("Отмечено: нужно больше данных");
  });
});
