import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { AuthProvider, DEMO_EMAIL } from "../auth/AuthProvider";

const SESSION_KEY = "triage-ai-session";

const scenario = {
  id: "release-regression-5xx",
  name: "Release regression: HTTP 5xx spike",
  incidentType: "Регрессия после релиза",
  serviceName: "payment-svc",
  description: "payment-svc starts returning 7.3% HTTP 5xx after deploy.",
  recommended: true
};

const integration = {
  kind: "prometheus",
  enabled: true,
  mode: "mock",
  displayName: "Prometheus metrics",
  status: "healthy",
  description: "Mock Prometheus-compatible Metrics ingestion для demo scenarios.",
  lastCheck: "2026-05-23T09:42:00.000Z",
  samplePayload: { source: "prometheus", metric: "http_5xx_rate" },
  productionRequirements: ["Prometheus endpoint", "read-only API Token"]
};

function incident(status = "active") {
  return {
    id: "inc-1",
    title: "HTTP 5xx spike on payment-svc",
    serviceName: "payment-svc",
    severity: "critical",
    status,
    startedAt: "2026-05-23T09:38:00.000Z",
    detectedAt: "2026-05-23T09:42:00.000Z",
    scenarioId: "release-regression-5xx",
    summary: "payment-svc показывает рост HTTP 5xx после Release.",
    hypothesis: "Вероятная root-cause hypothesis — regression в feat/retry-logic-v2.",
    confidence: "high",
    metrics: [
      { id: "m1", timestamp: "2026-05-23T09:42:00.000Z", serviceName: "payment-svc", name: "http_5xx_rate", value: 0.073, unit: "ratio", labels: {} }
    ],
    logs: [
      { id: "l1", timestamp: "2026-05-23T09:42:00.000Z", serviceName: "payment-svc", level: "error", message: "RetryBudgetExceeded", source: "elk" }
    ],
    deploys: [
      { id: "d1", timestamp: "2026-05-23T09:38:00.000Z", serviceName: "payment-svc", version: "rc.18", branch: "feat/retry-logic-v2", commitSha: "a81f3c9", author: "payments-team", summary: "Changed retry policy" }
    ],
    analysis: {
      summary: "payment-svc показывает резкий рост HTTP 5xx после недавнего Release.",
      affectedServices: ["payment-svc"],
      hypothesis: "Вероятная root-cause hypothesis — regression в feat/retry-logic-v2.",
      confidence: "high",
      reasoning: ["metric", "deploy"],
      nextStep: "Проверьте Deployment diff и выполните rollback.",
      evidence: [
        { id: "ev1", kind: "deploy", refId: "d1", title: "Recent deploy correlation", quote: "feat/retry-logic-v2", weight: 0.9 }
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
    email: DEMO_EMAIL,
    name: "Demo user",
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
            text: "AI summary готова",
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

  it("redirects unauthenticated users from Dashboard to login", async () => {
    renderApp("/dashboard");

    expect(await screen.findByText("Вход в Triage AI")).toBeInTheDocument();
  });

  it("logs in with demo credentials and opens Dashboard", async () => {
    renderApp("/login");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByText("Консоль triage инцидентов")).toBeInTheDocument();
  });

  it("runs a demo scenario and updates incident status", async () => {
    signIn();
    renderApp("/dashboard");
    const user = userEvent.setup();

    await screen.findByText("Release regression: HTTP 5xx spike");
    await user.click(screen.getByRole("button", { name: /Запустить scenario Release regression/i }));

    expect(await screen.findByText(/payment-svc показывает резкий рост HTTP 5xx/i)).toBeInTheDocument();
    expect(await screen.findByText("Recent deploy correlation")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Принять в работу/i })[0]!);

    await waitFor(() => {
      expect(screen.getByText("Incident: Принят в работу")).toBeInTheDocument();
    });
  });

  it("opens integration details and tests mock connection", async () => {
    signIn();
    renderApp("/integrations");
    const user = userEvent.setup();

    expect((await screen.findAllByText("Prometheus metrics")).length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole("button", { name: /Проверить/i })[0]!);

    expect(await screen.findByText("Mock connection проверен, status обновлен")).toBeInTheDocument();
  });

  it("filters documentation sections with docs search", async () => {
    signIn();
    renderApp("/docs");
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Поиск"), "low");

    expect(screen.getAllByText("Demo scenarios").length).toBeGreaterThan(0);
    expect(screen.queryByText("Войдите в личный кабинет.")).not.toBeInTheDocument();
  });
});
