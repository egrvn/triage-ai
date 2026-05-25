import { expect, test } from "@playwright/test";
import { createIncident, login, resetDemo } from "./helpers";

test.describe("Эскалации", () => {
  test.beforeEach(async ({ request }) => {
    await resetDemo(request);
  });

  test("escalating incident creates event and shows it in dedicated section", async ({ page, request }) => {
    const incidentId = await createIncident(request);
    await login(page);
    await page.goto(`/incidents/${incidentId}`);

    await page.getByRole("button", { name: /Принять в работу/i }).click();
    await expect(page.getByRole("status")).toContainText(/Инцидент принят в работу|В работе/i);
    await expect(page.locator(".sidebar-status-counter", { hasText: "В работе" })).toContainText("1");

    await page.getByRole("button", { name: /^Эскалировать$/i }).click();
    await expect(page.getByRole("status")).toContainText(/Инцидент отправлен на эскалацию|На эскалации/i);
    await expect(page.locator(".sidebar-status-counter", { hasText: "Эскалация" })).toContainText("1");
    await expect(page.locator(".sidebar-status-counter", { hasText: "В работе" })).toContainText("0");
    await expect(page.getByText("На эскалации").first()).toBeVisible();

    const escalationTab = page.getByRole("link", { name: "Эскалация", exact: true });
    await expect(escalationTab).toBeVisible();
    await escalationTab.click();
    await expect(page.getByRole("heading", { name: /События эскалации/i })).toBeVisible();
    await expect(page.locator(".escalation-section")).toContainText("Инцидент передан на эскалацию");
    await expect(page.getByText(/На эскалации/i).first()).toBeVisible();

    await page.getByRole("button", { name: /Скопировать handoff summary/i }).click();
    await expect(page.locator(".escalation-section")).toContainText("Handoff summary скопирован");

    await page.getByRole("link", { name: /Инциденты/i }).click();
    await expect(page.getByRole("heading", { name: /Очередь эскалации/i })).toBeVisible();
    await expect(page.getByText(/Инцидентов на эскалации пока нет/i)).toHaveCount(0);
    await expect(page.getByText(/Всплеск HTTP 5xx|Timeout зависимости checkout|Превышение p95 latency/i).first()).toBeVisible();

    await page.reload();
    await expect(page.locator(".sidebar-status-counter", { hasText: "Эскалация" })).toContainText("1");
    await expect(page.getByRole("heading", { name: /Очередь эскалации/i })).toBeVisible();
  });
});
