import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { AuthProvider, TEST_EMAIL } from "../auth/AuthProvider";

const SESSION_KEY = "triage-ai-session";

const scenario = {
  id: "release-regression-5xx",
  name: "Регрессия после релиза: всплеск HTTP 5xx",
  incidentType: "Регрессия после релиза",
  serviceName: "payment-svc",
  description: "payment-svc начинает возвращать 7,3% HTTP 5xx после развертывания.",
  recommended: true
};

const integration = {
  kind: "prometheus",
  enabled: true,
  mode: "mock",
  displayName: "Метрики Prometheus",
  status: "healthy",
  description: "Тестовый Prometheus-compatible ingestion метрик для демонстрационных сценариев.",
  lastCheck: "2026-05-23T09:42:00.000Z",
  samplePayload: { source: "prometheus", metric: "http_5xx_rate" },
  productionRequirements: ["Prometheus endpoint", "read-only API Token"]
};

function incident(status = "active") {
  return {
    id: "inc-1",
    title: "Всплеск HTTP 5xx в payment-svc",
    serviceName: "payment-svc",
    severity: "critical",
    status,
    startedAt: "2026-05-23T09:38:00.000Z",
    detectedAt: "2026-05-23T09:42:00.000Z",
    scenarioId: "release-regression-5xx",
    summary: "payment-svc показывает рост HTTP 5xx после релиза.",
    hypothesis: "Вероятная гипотеза причины — регрессия в feat/retry-logic-v2.",
    confidence: "high",
    metrics: [
      { id: "m1", timestamp: "2026-05-23T09:42:00.000Z", serviceName: "payment-svc", name: "http_5xx_rate", value: 0.073, unit: "ratio", labels: {} }
    ],
    logs: [
      { id: "l1", timestamp: "2026-05-23T09:42:00.000Z", serviceName: "payment-svc", level: "error", message: "RetryBudgetExceeded", source: "elk" }
    ],
    deploys: [
      { id: "d1", timestamp: "2026-05-23T09:38:00.000Z", serviceName: "payment-svc", version: "rc.18", branch: "feat/retry-logic-v2", commitSha: "a81f3c9", author: "payments-team", summary: "Изменена retry policy" }
    ],
    analysis: {
      summary: "payment-svc показывает резкий рост HTTP 5xx после недавнего релиза.",
      affectedServices: ["payment-svc"],
      hypothesis: "Вероятная гипотеза причины — регрессия в feat/retry-logic-v2.",
      confidence: "high",
      reasoning: ["metric", "deploy"],
      nextStep: "Проверьте Deployment diff и выполните rollback.",
      evidence: [
        { id: "ev1", kind: "deploy", refId: "d1", title: "Связь с недавним развертыванием", quote: "feat/retry-logic-v2", weight: 0.9 }
      ]
    }
  };
}

function incidentList(status = "active") {
  const detail = incident(status);
  return [{
    id: detail.id,
    title: detail.title,
    serviceName: detail.serviceName,
    severity: detail.severity,
    status: detail.status,
    startedAt: detail.startedAt,
    detectedAt: detail.detectedAt,
    scenarioId: detail.scenarioId,
    summary: detail.summary,
    hypothesis: detail.hypothesis,
    confidence: detail.confidence
  }];
}

function signIn() {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({
    email: TEST_EMAIL,
    name: "Тестовый пользователь",
    createdAt: "2026-05-23T09:00:00.000Z"
  }));
}

function renderApp(route = "/") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  return render(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("Triage AI MVP", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.clear();
    let created = false;
    let status = "active";
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/scenarios") && method === "GET") {
        return Response.json([scenario]);
      }

      if (url.endsWith("/api/incidents") && method === "GET") {
        return Response.json(created ? incidentList(status) : []);
      }

      if (url.endsWith("/api/settings/integrations") && method === "GET") {
        return Response.json([integration]);
      }

      if (url.endsWith("/api/scenarios/release-regression-5xx/run") && method === "POST") {
        created = true;
        status = "active";
        return Response.json({
          incident: incident(status),
          notification: {
            channel: "telegram",
            text: "сводка ИИ готова",
            deepLink: "/incidents/inc-1"
          }
        });
      }

      if (url.endsWith("/api/incidents/inc-1/status") && method === "PATCH") {
        status = JSON.parse(String(init?.body)).status;
        return Response.json(incident(status));
      }

      if (url.endsWith("/api/incidents/inc-1") && method === "GET") {
        return Response.json(incident(status));
      }

      if (url.endsWith("/api/settings/integrations/prometheus/test") && method === "POST") {
        return Response.json({
          integration: { ...integration, lastCheck: "2026-05-23T10:00:00.000Z" },
          checkedAt: "2026-05-23T10:00:00.000Z",
          sampleAccepted: true
        });
      }

      if (url.endsWith("/api/demo/reset") && method === "POST") {
        created = false;
        return Response.json({ ok: true, incidentsCleared: 1, integrationsReset: 1, timestamp: "2026-05-23T10:00:00.000Z" });
      }

      return new Response("not found", { status: 404 });
    }));
  });

  it("redirects unauthenticated users from protected routes to login", async () => {
    renderApp("/incidents");

    expect(await screen.findByText("Вход в Triage AI")).toBeInTheDocument();
  });

  it("logs in with test credentials and opens the dashboard", async () => {
    renderApp("/login");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByText("Панель разбора инцидентов")).toBeInTheDocument();
  });

  it("runs a demonstration scenario, updates chart, and changes incident status", async () => {
    signIn();
    renderApp("/dashboard");
    const user = userEvent.setup();

    await screen.findByText("Регрессия после релиза: всплеск HTTP 5xx");
    await user.click(screen.getByRole("button", { name: /Запустить сценарий Регрессия после релиза/i }));

    expect(await screen.findByText(/Демонстрационный сценарий выполнен/i)).toBeInTheDocument();
    await user.click(await screen.findByRole("link", { name: /Открыть анализ инцидентов/i }));

    expect(await screen.findByText(/payment-svc показывает резкий рост HTTP 5xx/i)).toBeInTheDocument();
    expect((await screen.findAllByText("Связь с недавним развертыванием")).length).toBeGreaterThan(0);
    expect(screen.getByText("AI-ассистент")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Объяснить гипотезу/i }).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: /Принять в работу/i })[0]!);

    await waitFor(() => {
      expect(screen.getByText("Инцидент: Принят в работу")).toBeInTheDocument();
    });
  });

  it("opens integration details and tests connection", async () => {
    signIn();
    renderApp("/integrations");
    const user = userEvent.setup();

    expect((await screen.findAllByText("Метрики Prometheus")).length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole("button", { name: /Проверить/i })[0]!);

    expect(await screen.findByText("Тестовое подключение проверено, статус обновлён")).toBeInTheDocument();
  });

  it("renders public documentation and filters sections", async () => {
    renderApp("/docs");
    const user = userEvent.setup();

    expect((await screen.findAllByText("Документация")).length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: "Triage AI" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Поиск"), "низкая");

    expect(screen.getAllByText("Демонстрационные сценарии").length).toBeGreaterThan(0);
    expect(screen.queryByText("Войдите в личный кабинет.")).not.toBeInTheDocument();
  });

  it("renders app documentation inside protected shell", async () => {
    signIn();
    renderApp("/app/docs");

    expect(await screen.findByText("Справочник по Triage AI внутри личного кабинета.")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Основная навигация" })).toBeInTheDocument();
  });
});
