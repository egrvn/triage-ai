import { expect, test } from "@playwright/test";
import { createIncident, expectNoHorizontalScroll, expectNoViewportOverflow, login } from "./helpers";

test.describe("final UI fixes flow", () => {
  test("incident workspace assistant responds to quick commands and free input", async ({ page, request }) => {
    const incidentId = await createIncident(request);
    await login(page);

    await page.goto("/incidents");
    await expect(page.getByRole("button", { name: /Открыть/ }).first()).toBeVisible();

    await page.goto(`/incidents/${incidentId}`);
    await expect(page.locator(".top-bar").getByText("Тестовый режим")).toHaveCount(1);
    await expect(page.locator(".top-bar").getByText("Тестовый проект")).toHaveCount(0);
    await expect(page.locator(".side-nav").getByText("Настройки", { exact: true })).toHaveCount(1);

    await page.getByRole("button", { name: /Что проверить первым/ }).first().click();
    await expect(page.locator(".assistant-message--assistant").last()).toContainText(/Сначала|проверьте/i);
    await expect(page.locator(".assistant-citations button").first()).toBeVisible();

    await page.getByPlaceholder("Спросите по этому инциденту...").fill("Покажи ключевые логи");
    await page.keyboard.press("Enter");
    await expect(page.locator(".assistant-message--user").last()).toContainText("Покажи ключевые логи");
    await expect(page.locator(".assistant-message--assistant").last()).toContainText(/лог|Retry|error/i);

    await page.getByRole("button", { name: /Скопировать сводку/ }).click();
    await expect(page.getByRole("status")).toContainText(/Summary скопирован|Не удалось скопировать|Clipboard недоступен/);
    await expectNoHorizontalScroll(page);
    await expectNoViewportOverflow(page);
  });

  test("assistant workspace keeps incident-specific context", async ({ page, request }) => {
    await createIncident(request);
    await login(page);

    await page.goto("/assistant");
    await expect(page.getByText("AI-ассистент").first()).toBeVisible();
    await page.getByPlaceholder("Задайте вопрос по выбранному инциденту...").fill("Нужен ли rollback?");
    await page.keyboard.press("Enter");

    await expect(page.locator(".assistant-message--user").last()).toContainText("Нужен ли rollback?");
    await expect(page.locator(".assistant-message--assistant").last()).toContainText(/Rollback|откат|deploy/i);
    await expect(page.getByRole("link", { name: /Открыть инцидент/ })).toHaveAttribute("href", /\/incidents\/inc-/);
    await expectNoHorizontalScroll(page);
  });
});
