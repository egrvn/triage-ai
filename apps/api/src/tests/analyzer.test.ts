import { describe, expect, it } from "vitest";
import { scenarioFixtures } from "../data/scenarios.js";
import { analyzeIncident } from "../services/analyzer.js";
import type { IncidentDetail } from "@coursework/shared";

function incidentFromScenario(id: string): IncidentDetail {
  const scenario = scenarioFixtures.find((item) => item.id === id);
  if (!scenario) {
    throw new Error(`Missing scenario ${id}`);
  }

  return {
    id: `test-${scenario.id}`,
    title: scenario.alert.title,
    serviceName: scenario.serviceName,
    severity: scenario.alert.severity,
    status: "active",
    startedAt: scenario.alert.startedAt,
    detectedAt: scenario.alert.detectedAt,
    scenarioId: scenario.id,
    metrics: scenario.metrics,
    logs: scenario.logs,
    deploys: scenario.deploys
  };
}

describe("analyzeIncident", () => {
  it("detects release regression and links deploy evidence", () => {
    const result = analyzeIncident(incidentFromScenario("release-regression-5xx"));

    expect(result.confidence).toBe("high");
    expect(result.hypothesis).toContain("feat/retry-logic-v2");
    expect(result.evidence.some((item) => item.kind === "deploy")).toBe(true);
    expect(result.evidence.some((item) => item.kind === "metric")).toBe(true);
  });

  it("uses low-confidence fallback for sparse context", () => {
    const result = analyzeIncident(incidentFromScenario("low-confidence-sparse-data"));

    expect(result.confidence).toBe("low");
    expect(result.hypothesis).toContain("Нет уверенной root cause");
    expect(result.reasoning.join(" ")).toContain("недостаточно специфичны");
  });
});
