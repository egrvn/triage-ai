import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { MemoryIncidentRepository } from "../repositories/memoryRepository.js";

describe("api routes", () => {
  it("runs a scenario and returns analyzed incident evidence", async () => {
    const app = await createApp({
      repository: new MemoryIncidentRepository(),
      config: {
        nodeEnv: "test",
        host: "127.0.0.1",
        port: 0,
        storageMode: "memory",
        corsOrigin: "*"
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/scenarios/release-regression-5xx/run"
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.incident.analysis.confidence).toBe("high");
    expect(body.incident.analysis.evidence.length).toBeGreaterThan(1);

    await app.close();
  });

  it("validates feedback payload", async () => {
    const app = await createApp({
      repository: new MemoryIncidentRepository(),
      config: {
        nodeEnv: "test",
        host: "127.0.0.1",
        port: 0,
        storageMode: "memory",
        corsOrigin: "*"
      }
    });

    const scenario = await app.inject({
      method: "POST",
      url: "/api/scenarios/low-confidence-sparse-data/run"
    });
    const incidentId = scenario.json().incident.id;

    const response = await app.inject({
      method: "POST",
      url: `/api/incidents/${incidentId}/feedback`,
      payload: {
        usefulness: "useful",
        hypothesisVerdict: "unknown"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().incidentId).toBe(incidentId);

    await app.close();
  });

  it("creates analyzed incident through Generic ingest with service alias", async () => {
    const app = await createApp({
      repository: new MemoryIncidentRepository(),
      config: {
        nodeEnv: "test",
        host: "127.0.0.1",
        port: 0,
        storageMode: "memory",
        corsOrigin: "*"
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/ingest/custom",
      payload: {
        source: "zabbix",
        service: "checkout-svc",
        severity: "warning",
        message: "p95 latency выше baseline",
        labels: { team: "payments" },
        logSnippet: "WARN checkout-svc upstream timeout",
        metricSnippet: "p95_latency_ms=1240"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().created).toBe(true);
    expect(response.json().normalizedServiceName).toBe("checkout-svc");
    expect(response.json().incident.analysis.confidence).toBe("low");
    expect(response.json().incident.events[0].text).toContain("Generic ingest");

    await app.close();
  });

  it("answers incident chat with citations and preserves history", async () => {
    const app = await createApp({
      repository: new MemoryIncidentRepository(),
      config: {
        nodeEnv: "test",
        host: "127.0.0.1",
        port: 0,
        storageMode: "memory",
        corsOrigin: "*"
      }
    });

    const scenario = await app.inject({
      method: "POST",
      url: "/api/scenarios/release-regression-5xx/run"
    });
    const incidentId = scenario.json().incident.id;

    const chatResponse = await app.inject({
      method: "POST",
      url: `/api/incidents/${incidentId}/chat`,
      payload: { message: "Что проверить первым?" }
    });

    expect(chatResponse.statusCode).toBe(200);
    expect(chatResponse.json().message.citations.length).toBeGreaterThan(0);
    expect(chatResponse.json().message.auditId).toMatch(/^audit-/);

    const historyResponse = await app.inject({
      method: "GET",
      url: `/api/incidents/${incidentId}/chat`
    });

    expect(historyResponse.statusCode).toBe(200);
    expect(historyResponse.json()).toHaveLength(2);

    await app.close();
  });

  it("does not invent a root cause for low-confidence chat", async () => {
    const app = await createApp({
      repository: new MemoryIncidentRepository(),
      config: {
        nodeEnv: "test",
        host: "127.0.0.1",
        port: 0,
        storageMode: "memory",
        corsOrigin: "*"
      }
    });

    const scenario = await app.inject({
      method: "POST",
      url: "/api/scenarios/low-confidence-sparse-data/run"
    });
    const incidentId = scenario.json().incident.id;

    const chatResponse = await app.inject({
      method: "POST",
      url: `/api/incidents/${incidentId}/chat`,
      payload: { message: "Объясни гипотезу", quickCommand: "Объясни гипотезу" }
    });

    expect(chatResponse.statusCode).toBe(200);
    expect(chatResponse.json().message.content).toContain("Недостаточно сигналов для уверенной гипотезы");
    expect(chatResponse.json().message.content).not.toContain("Вероятная причина");

    await app.close();
  });

  it("updates incident status, resets demo data, and tests integration connection", async () => {
    const app = await createApp({
      repository: new MemoryIncidentRepository(),
      config: {
        nodeEnv: "test",
        host: "127.0.0.1",
        port: 0,
        storageMode: "memory",
        corsOrigin: "*"
      }
    });

    const scenario = await app.inject({
      method: "POST",
      url: "/api/scenarios/release-regression-5xx/run"
    });
    const incidentId = scenario.json().incident.id;

    const statusResponse = await app.inject({
      method: "PATCH",
      url: `/api/incidents/${incidentId}/status`,
      payload: { status: "in_progress" }
    });

    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json().status).toBe("in_progress");

    const legacyStatusResponse = await app.inject({
      method: "PATCH",
      url: `/api/incidents/${incidentId}/status`,
      payload: { status: "acknowledged" }
    });

    expect(legacyStatusResponse.statusCode).toBe(200);
    expect(legacyStatusResponse.json().status).toBe("in_progress");

    const integrationResponse = await app.inject({
      method: "POST",
      url: "/api/settings/integrations/prometheus/test"
    });

    expect(integrationResponse.statusCode).toBe(200);
    expect(integrationResponse.json().integration.kind).toBe("prometheus");
    expect(integrationResponse.json().sampleAccepted).toBe(true);

    const resetResponse = await app.inject({
      method: "POST",
      url: "/api/demo/reset"
    });

    expect(resetResponse.statusCode).toBe(200);
    expect(resetResponse.json().incidentsCleared).toBeGreaterThan(0);

    const incidents = await app.inject({
      method: "GET",
      url: "/api/incidents"
    });
    expect(incidents.json()).toEqual([]);

    await app.close();
  });

  it("creates escalation events and updates incident status", async () => {
    const app = await createApp({
      repository: new MemoryIncidentRepository(),
      config: {
        nodeEnv: "test",
        host: "127.0.0.1",
        port: 0,
        storageMode: "memory",
        corsOrigin: "*"
      }
    });

    const scenario = await app.inject({
      method: "POST",
      url: "/api/scenarios/release-regression-5xx/run"
    });
    const incidentId = scenario.json().incident.id;

    const escalationResponse = await app.inject({
      method: "POST",
      url: `/api/incidents/${incidentId}/escalations`
    });

    expect(escalationResponse.statusCode).toBe(200);
    expect(escalationResponse.json().incident.status).toBe("escalated");
    expect(escalationResponse.json().escalation.evidenceRefs.length).toBeGreaterThan(0);

    const incidentsResponse = await app.inject({
      method: "GET",
      url: "/api/incidents"
    });
    expect(incidentsResponse.statusCode).toBe(200);
    expect(incidentsResponse.json()[0].status).toBe("escalated");

    const historyResponse = await app.inject({
      method: "GET",
      url: `/api/incidents/${incidentId}/escalations`
    });

    expect(historyResponse.statusCode).toBe(200);
    expect(historyResponse.json()).toHaveLength(1);

    await app.close();
  });
});
