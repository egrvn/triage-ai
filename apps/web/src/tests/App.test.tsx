import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";

const scenario = {
  id: "release-regression-5xx",
  name: "Release regression: HTTP 5xx spike",
  incidentType: "Регрессия после релиза",
  serviceName: "payment-svc",
  description: "payment-svc starts returning 7.3% HTTP 5xx after deploy.",
  recommended: true
};

const incident = {
  id: "inc-1",
  title: "HTTP 5xx spike on payment-svc",
  serviceName: "payment-svc",
  severity: "critical",
  status: "active",
  startedAt: "2026-05-23T09:38:00.000Z",
  detectedAt: "2026-05-23T09:42:00.000Z",
  scenarioId: "release-regression-5xx",
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
    summary: "payment-svc shows a sharp HTTP 5xx increase after a recent release.",
    affectedServices: ["payment-svc"],
    hypothesis: "Most likely root cause is a regression in feat/retry-logic-v2.",
    confidence: "high",
    reasoning: ["metric", "deploy"],
    nextStep: "Validate deploy diff and rollback if confirmed.",
    evidence: [
      { id: "ev1", kind: "deploy", refId: "d1", title: "Recent deploy correlation", quote: "feat/retry-logic-v2", weight: 0.9 }
    ]
  }
};

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith("/api/scenarios") && !init?.method) {
        return Response.json([scenario]);
      }

      if (url.endsWith("/api/incidents") && !init?.method) {
        return Response.json([]);
      }

      if (url.endsWith("/api/settings/integrations") && !init?.method) {
        return Response.json([]);
      }

      if (url.endsWith("/api/scenarios/release-regression-5xx/run")) {
        return Response.json({
          incident,
          notification: {
            channel: "telegram",
            text: "AI summary is ready",
            deepLink: "/incidents/inc-1"
          }
        });
      }

      if (url.endsWith("/api/incidents/inc-1")) {
        return Response.json(incident);
      }

      if (url.endsWith("/api/incidents/inc-1/feedback")) {
        return Response.json({ id: "fb-1", incidentId: "inc-1", createdAt: "2026-05-23T09:43:00.000Z" });
      }

      return new Response("not found", { status: 404 });
    }));
  });

  it("runs scenario and reveals explainability evidence", async () => {
    renderApp();
    const user = userEvent.setup();

    await screen.findByText("Release regression: HTTP 5xx spike");
    await user.click(screen.getByRole("button", { name: /Release regression/i }));

    expect(await screen.findByText(/AI summary/i)).toBeInTheDocument();
    expect(await screen.findByText(/Most likely root cause/i)).toBeInTheDocument();
    expect(await screen.findByText(/Recent deploy correlation/i)).toBeInTheDocument();
  });
});
