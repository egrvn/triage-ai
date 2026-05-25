import { expect, test } from "@playwright/test";
import { createIncident, expectNoHorizontalScroll, expectNoViewportOverflow, login, resetDemo } from "./helpers";

test.describe("Incident workspace", () => {
  test.beforeEach(async ({ request }) => {
    await resetDemo(request);
  });

  test("dashboard scenario button creates and opens incident workspace", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");

    await page.getByRole("button", { name: /Запустить сценарий Регрессия после релиза/i }).click();

    await expect(page).toHaveURL(/\/incidents\/inc-/);
    await expect(page.getByRole("heading", { name: /Рабочая область инцидента/i })).toBeVisible();
    await expect(page.getByText(/Всплеск HTTP 5xx|Регрессия после релиза/i).first()).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoViewportOverflow(page);
  });

  test("empty duty queue button creates incident instead of only navigating away", async ({ page }) => {
    await login(page);
    await page.goto("/incidents?mode=on-call");

    await expect(page.getByText(/Активных инцидентов нет/i)).toBeVisible();
    await page.getByRole("button", { name: /Запустить сценарий/i }).click();

    await expect(page).toHaveURL(/\/incidents\/inc-/);
    await expect(page.getByRole("heading", { name: /Рабочая область инцидента/i })).toBeVisible();
    await expect(page.locator(".incident-header")).toContainText(/Новый|В работе|На эскалации/);

    await page.getByRole("link", { name: /Инциденты/i }).click();
    await expect(page.locator(".metric-card").filter({ hasText: "Новые" })).toContainText("1");
    await expect(page.getByText(/Активных инцидентов нет/i)).toHaveCount(0);
  });

  test("opens any incident from list and keeps queue metrics readable", async ({ page, request }) => {
    const incidentId = await createIncident(request);
    await login(page);
    await page.goto("/incidents");

    const inProgressCard = page.locator(".metric-card").filter({ hasText: "В работе" }).first();
    await expect(inProgressCard).toBeVisible();
    const labelWidth = await inProgressCard.locator("span", { hasText: "В работе" }).evaluate((el) => el.getBoundingClientRect().width);
    expect(labelWidth).toBeGreaterThan(60);

    await page.getByRole("button", { name: /Открыть/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/incidents/${incidentId}`));
    await expectNoHorizontalScroll(page);
    await expectNoViewportOverflow(page);
  });

  test("accept and escalate update status queues and counters", async ({ page, request }) => {
    await createIncident(request);
    await login(page);
    await page.goto("/incidents");

    await page.getByRole("button", { name: /Принять в работу/i }).first().click();
    await expect(page.locator(".inline-status")).toContainText("Инцидент принят в работу");
    await expect(page.locator(".sidebar-status-counter").filter({ hasText: "В работе" })).toContainText("1");
    await expect(page.getByText("В работе").first()).toBeVisible();

    await page.getByRole("button", { name: /^Эскалировать$/i }).first().click();
    await expect(page.locator(".inline-status")).toContainText("Инцидент отправлен на эскалацию");
    await expect(page.locator(".sidebar-status-counter").filter({ hasText: "Эскалация" })).toContainText("1");
    await expect(page.getByText("Очередь эскалации")).toBeVisible();
    await expect(page.locator(".incident-row").first()).toContainText("На эскалации");

    const filtersTop = await page.getByText(/Расширенный отбор|Отбор инцидентов и логов/).first().boundingBox();
    const incidentTop = await page.getByText("Очередь эскалации").boundingBox();
    expect(filtersTop?.y ?? 0).toBeGreaterThan(incidentTop?.y ?? 0);

    await expectNoHorizontalScroll(page);
    await expectNoViewportOverflow(page);
  });

  test("workspace action buttons update incident status and sidebar counters", async ({ page, request }) => {
    const incidentId = await createIncident(request);
    await login(page);
    await page.goto(`/incidents/${incidentId}`);

    await page.getByRole("button", { name: /Принять в работу/i }).click();
    await expect(page.locator(".inline-status")).toContainText("Инцидент принят в работу");
    await expect(page.locator(".incident-header")).toContainText("В работе");
    await expect(page.locator(".sidebar-status-counter").filter({ hasText: "В работе" })).toContainText("1");

    await page.getByRole("button", { name: /^Эскалировать$/i }).click();
    await expect(page.locator(".inline-status")).toContainText("Инцидент отправлен на эскалацию");
    await expect(page.locator(".incident-header")).toContainText("На эскалации");
    await expect(page.locator(".sidebar-status-counter").filter({ hasText: "Эскалация" })).toContainText("1");

    await page.reload();
    await expect(page.locator(".incident-header")).toContainText("На эскалации");

    await expectNoHorizontalScroll(page);
    await expectNoViewportOverflow(page);
  });

  test("explainability, metrics and logs are readable through details dialogs", async ({ page, request }) => {
    const incidentId = await createIncident(request);
    await login(page);
    await page.goto(`/incidents/${incidentId}`);

    await page.getByRole("button", { name: /Объяснить гипотезу/i }).click();
    await expect(page.locator(".explainability-panel .copilot-citations button").first()).toBeVisible();
    const hypothesisLayout = await page.locator(".explainability-panel__body").evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const columns = Array.from(node.children).map((child) => child.getBoundingClientRect().width);
      return { width: rect.width, columns };
    });
    expect(hypothesisLayout.width).toBeGreaterThan(540);
    expect(hypothesisLayout.columns[0]).toBeGreaterThanOrEqual(260);

    await page.getByRole("button", { name: /Открыть метрики/i }).click();
    const metricsDialog = page.getByRole("dialog", { name: /Метрики инцидента/i });
    await expect(metricsDialog).toBeVisible();
    await expect(metricsDialog.locator("table")).toBeVisible();
    await metricsDialog.getByRole("button", { name: /Закрыть/i }).click();

    await page.getByRole("button", { name: /Открыть логи/i }).click();
    const logsDialog = page.getByRole("dialog", { name: /Логи инцидента/i });
    await expect(logsDialog).toBeVisible();
    await expect(logsDialog.locator("pre").first()).toBeVisible();
    await logsDialog.getByRole("button", { name: /Закрыть/i }).click();

    const dataCardLayout = await page.locator(".data-preview-card").evaluateAll((cards) =>
      cards.map((card) => {
        const cardRect = card.getBoundingClientRect();
        const button = card.querySelector(".ui-button");
        const buttonRect = button?.getBoundingClientRect();
        return {
          cardScrollWidth: (card as HTMLElement).scrollWidth,
          cardClientWidth: (card as HTMLElement).clientWidth,
          buttonInside: buttonRect ? buttonRect.right <= cardRect.right + 1 && buttonRect.left >= cardRect.left - 1 : false
        };
      })
    );
    expect(dataCardLayout.every((item) => item.cardScrollWidth <= item.cardClientWidth + 1)).toBe(true);
    expect(dataCardLayout.every((item) => item.buttonInside)).toBe(true);

    await expectNoHorizontalScroll(page);
    await expectNoViewportOverflow(page);
  });
});
