import { expect, test } from "@playwright/test";
import {
  createIncident,
  createScenarioIncident,
  expectNoHorizontalScroll,
  expectNoViewportOverflow,
  login,
  resetDemo
} from "./helpers";

test.describe("AI-ассистент", () => {
  test.beforeEach(async ({ request }) => {
    await resetDemo(request);
  });

  test("quick command and free input add visible assistant responses", async ({ page, request }) => {
    const incidentId = await createIncident(request);
    await login(page);
    await page.goto(`/incidents/${incidentId}`);

    const panel = page.locator(".incident-assistant-panel").first();
    await page.getByRole("button", { name: /Как снизить impact/i }).first().click();
    await expect(panel.locator(".assistant-message--user").last()).toContainText("Как снизить impact?");
    await expect(panel.getByText(/Чтобы снизить impact/i)).toBeVisible();
    await expect(panel.locator(".assistant-citations button").first()).toBeVisible();

    await page.getByPlaceholder(/Спросите по этому инциденту/i).fill("Покажи ключевые логи");
    await page.getByRole("button", { name: /Отправить/i }).click();
    await expect(panel.locator(".assistant-message--user").last()).toContainText("Покажи ключевые логи");
    await expect(panel.locator(".assistant-message--assistant").last()).toContainText(/Ключевые логи/i);

    await page.getByRole("button", { name: /^Постмортем$/i }).first().click();
    await expect(panel.locator(".assistant-message--assistant").last()).toContainText(/Постмортем пока рано/i);

    await page.getByPlaceholder(/Спросите по этому инциденту/i).fill("какой сейчас SLA у команды?");
    await page.getByRole("button", { name: /Отправить/i }).click();
    await expect(panel.locator(".assistant-message--assistant").last()).toContainText(/Такой запрос пока не обрабатывается скриптом/i);

    await expect(panel.getByPlaceholder(/Спросите по этому инциденту/i)).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoViewportOverflow(page);
  });

  test("low confidence answer does not invent root cause", async ({ page, request }) => {
    const incidentId = await createScenarioIncident(request, "low-confidence-sparse-data");
    await login(page);
    await page.goto(`/incidents/${incidentId}`);

    await page.getByRole("button", { name: /Объясни гипотезу/i }).first().click();
    await expect(page.getByText(/Недостаточно сигналов для уверенной гипотезы/i)).toBeVisible();
    await expect(page.locator(".incident-assistant-panel .assistant-message--assistant").last()).not.toContainText("Вероятная причина");
  });

  test("/assistant keeps context panel inside viewport", async ({ page, request }) => {
    await createIncident(request);
    await login(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/assistant");

    await expect(page.getByRole("heading", { name: "Контекст ответа" })).toBeVisible();
    await page.getByPlaceholder(/Задайте вопрос по выбранному инциденту/i).fill("Что проверить первым?");
    await page.getByRole("button", { name: /Отправить/i }).click();
    await expect(page.locator(".incident-assistant-panel .assistant-message--assistant").last()).toContainText(/Сначала проверьте/i);
    await page.getByRole("button", { name: /Покажи ключевые логи/i }).first().click();
    await expect(page.locator(".incident-assistant-panel .assistant-message--assistant").last()).toContainText(/Ключевые логи/i);
    await expect(page.getByRole("link", { name: /Открыть инцидент/i })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoViewportOverflow(page);
  });

  test("/assistant creates manual incident through Generic ingest", async ({ page }) => {
    await login(page);
    await page.goto("/assistant");

    await page.getByLabel("Сервис").fill("manual-svc");
    await page.getByLabel("Описание сигнала").fill("Ручной сигнал: рост ошибок manual-svc после изменения конфигурации.");
    await page.getByRole("button", { name: /Создать инцидент|Создать через Generic ingest/i }).click();

    await expect(page.getByRole("status")).toContainText(/Инцидент создан через Generic ingest/i);
    await expect(page.locator(".assistant-incident-list").getByText(/manual-svc/i).first()).toBeVisible();
    await page.getByPlaceholder(/Задайте вопрос по выбранному инциденту/i).fill("Что проверить первым?");
    await page.getByRole("button", { name: /Отправить/i }).click();
    await expect(page.locator(".incident-assistant-panel .assistant-message--assistant").last()).toContainText(/Сначала проверьте/i);
    await expectNoHorizontalScroll(page);
    await expectNoViewportOverflow(page);
  });

  test("/assistant incident list scrolls without clipping many cards", async ({ page, request }) => {
    const scenarioIds = [
      "release-regression-5xx",
      "latency-under-load",
      "external-api-timeout",
      "low-confidence-sparse-data"
    ];
    for (let index = 0; index < 10; index += 1) {
      await createScenarioIncident(request, scenarioIds[index % scenarioIds.length]);
    }

    await login(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/assistant");

    const list = page.locator(".assistant-incident-list__items");
    await expect(list).toBeVisible();
    await list.evaluate((node) => {
      node.scrollTo(0, node.scrollHeight);
    });

    const lastCard = list.locator("button").last();
    await expect(lastCard).toBeVisible();
    const geometry = await lastCard.evaluate((card) => {
      const cardRect = card.getBoundingClientRect();
      const listRect = card.parentElement!.getBoundingClientRect();
      return {
        cardBottom: cardRect.bottom,
        listBottom: listRect.bottom,
        cardLeft: cardRect.left,
        listLeft: listRect.left,
        cardRight: cardRect.right,
        listRight: listRect.right
      };
    });

    expect(geometry.cardBottom).toBeLessThanOrEqual(geometry.listBottom + 1);
    expect(geometry.cardLeft).toBeGreaterThanOrEqual(geometry.listLeft - 1);
    expect(geometry.cardRight).toBeLessThanOrEqual(geometry.listRight + 1);
    await expectNoHorizontalScroll(page);
  });
});
