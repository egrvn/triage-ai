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
});
