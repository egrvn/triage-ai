import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const TEST_EMAIL = "demo@triage.ai";
export const TEST_PASSWORD = "demo1234";

export async function login(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("triage-ai-session"));
  await page.goto("/login");
  await page.getByLabel("Email").fill(TEST_EMAIL);
  await page.getByLabel("Пароль").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function createIncident(request: APIRequestContext) {
  const response = await request.post("/api/scenarios/release-regression-5xx/run", { data: {} });
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return body.incident.id as string;
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth
  }));
  expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width + 1);
  expect(overflow.bodyScrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width + 1);
}

export async function expectNoViewportOverflow(page: Page) {
  const overflowing = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const hasScrollableAncestor = (element: Element) => {
      let current = element.parentElement;
      while (current && current !== document.body) {
        const styles = window.getComputedStyle(current);
        if (["auto", "scroll"].includes(styles.overflowX) && current.scrollWidth > current.clientWidth + 2) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    };

    return Array.from(document.querySelectorAll("body *"))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        return {
          tag: el.tagName,
          className: (el as HTMLElement).className?.toString?.() || "",
          text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
          left: rect.left,
          right: rect.right,
          width: rect.width,
          display: styles.display,
          position: styles.position,
          overflowX: styles.overflowX,
          insideScrollable: hasScrollableAncestor(el)
        };
      })
      .filter((item) => {
        if (item.width === 0 || item.display === "none") return false;
        if (item.position === "fixed") return false;
        if (item.className.includes("recharts-wrapper")) return false;
        if (item.insideScrollable) return false;
        return item.right > viewportWidth + 2 || item.left < -2;
      });
  });

  expect(overflowing).toEqual([]);
}

export async function expectCriticalBlocksNotClipped(page: Page) {
  const clipped = await page.evaluate(() => {
    const selectors = [
      ".llm-provider-card",
      ".incident-filter-panel",
      ".metric-card",
      ".incident-detail",
      ".integration-detail",
      ".copilot-panel",
      ".code-block-section"
    ];

    return Array.from(document.querySelectorAll(selectors.join(",")))
      .map((el) => {
        const node = el as HTMLElement;
        return {
          selector: selectors.find((selector) => node.matches(selector)) ?? node.className,
          text: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
          scrollWidth: node.scrollWidth,
          clientWidth: node.clientWidth,
          scrollHeight: node.scrollHeight,
          clientHeight: node.clientHeight
        };
      })
      .filter((item) => item.scrollWidth > item.clientWidth + 2);
  });

  expect(clipped).toEqual([]);
}
