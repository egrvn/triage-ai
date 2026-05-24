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
      payload: { status: "acknowledged" }
    });

    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json().status).toBe("acknowledged");

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
});
