import type {
  FeedbackRequest,
  FeedbackResponse,
  DemoResetResponse,
  IncidentAnalysis,
  IncidentDetail,
  IncidentListItem,
  IntegrationSetting,
  TestIntegrationResponse,
  ScenarioSummary,
  UpdateIncidentStatus,
  UpdateIntegrationSetting
} from "@coursework/shared";
import { scenarioFixtures } from "../data/scenarios.js";
import { defaultIntegrationSettings } from "./defaultSettings.js";
import type { IncidentRepository } from "./types.js";

const nowId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function toListItem(incident: IncidentDetail): IncidentListItem {
  return {
    id: incident.id,
    title: incident.title,
    serviceName: incident.serviceName,
    severity: incident.severity,
    status: incident.status,
    startedAt: incident.startedAt,
    detectedAt: incident.detectedAt,
    scenarioId: incident.scenarioId,
    summary: incident.analysis?.summary ?? incident.summary,
    hypothesis: incident.analysis?.hypothesis ?? incident.hypothesis,
    confidence: incident.analysis?.confidence ?? incident.confidence
  };
}

export class MemoryIncidentRepository implements IncidentRepository {
  private incidents = new Map<string, IncidentDetail>();
  private settings = new Map(defaultIntegrationSettings.map((setting) => [setting.kind, clone(setting)]));

  async listScenarios(): Promise<ScenarioSummary[]> {
    return scenarioFixtures.map(({ alert: _alert, metrics: _metrics, logs: _logs, deploys: _deploys, ...summary }) => clone(summary));
  }

  async runScenario(scenarioId: string): Promise<IncidentDetail> {
    const scenario = scenarioFixtures.find((candidate) => candidate.id === scenarioId);

    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} was not found`);
    }

    const incidentId = `inc-${scenario.id}-${nowId()}`;
    const incident: IncidentDetail = {
      id: incidentId,
      title: scenario.alert.title,
      serviceName: scenario.serviceName,
      severity: scenario.alert.severity,
      status: "active",
      startedAt: scenario.alert.startedAt,
      detectedAt: scenario.alert.detectedAt,
      scenarioId: scenario.id,
      metrics: scenario.metrics.map((metric) => ({ ...metric, id: `${incidentId}-${metric.id}` })),
      logs: scenario.logs.map((log) => ({ ...log, id: `${incidentId}-${log.id}` })),
      deploys: scenario.deploys.map((deploy) => ({ ...deploy, id: `${incidentId}-${deploy.id}` }))
    };

    this.incidents.set(incidentId, incident);
    return clone(incident);
  }

  async ingestAlert(input: {
    serviceName: string;
    title: string;
    severity: "critical" | "warning" | "info";
    timestamp: string;
    labels: Record<string, string>;
  }): Promise<IncidentDetail> {
    const incidentId = `inc-manual-${nowId()}`;
    const incident: IncidentDetail = {
      id: incidentId,
      title: input.title,
      serviceName: input.serviceName,
      severity: input.severity,
      status: "active",
      startedAt: input.timestamp,
      detectedAt: input.timestamp,
      metrics: [],
      logs: [],
      deploys: []
    };

    this.incidents.set(incidentId, incident);
    return clone(incident);
  }

  async listIncidents(): Promise<IncidentListItem[]> {
    return [...this.incidents.values()]
      .toSorted((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
      .map(toListItem);
  }

  async getIncident(id: string): Promise<IncidentDetail | null> {
    return this.incidents.has(id) ? clone(this.incidents.get(id)!) : null;
  }

  async saveAnalysis(incidentId: string, analysis: IncidentAnalysis): Promise<IncidentDetail> {
    const incident = this.incidents.get(incidentId);

    if (!incident) {
      throw new Error(`Incident ${incidentId} was not found`);
    }

    const nextIncident: IncidentDetail = {
      ...incident,
      summary: analysis.summary,
      hypothesis: analysis.hypothesis,
      confidence: analysis.confidence,
      analysis
    };

    this.incidents.set(incidentId, nextIncident);
    return clone(nextIncident);
  }

  async updateIncidentStatus(incidentId: string, input: UpdateIncidentStatus): Promise<IncidentDetail> {
    const incident = this.incidents.get(incidentId);

    if (!incident) {
      throw new Error(`Incident ${incidentId} was not found`);
    }

    const nextIncident: IncidentDetail = {
      ...incident,
      status: input.status
    };

    this.incidents.set(incidentId, nextIncident);
    return clone(nextIncident);
  }

  async saveFeedback(incidentId: string, _feedback: FeedbackRequest): Promise<FeedbackResponse> {
    if (!this.incidents.has(incidentId)) {
      throw new Error(`Incident ${incidentId} was not found`);
    }

    return {
      id: `fb-${nowId()}`,
      incidentId,
      createdAt: new Date().toISOString()
    };
  }

  async listIntegrations(): Promise<IntegrationSetting[]> {
    return [...this.settings.values()].map(clone);
  }

  async updateIntegration(input: UpdateIntegrationSetting): Promise<IntegrationSetting> {
    const current = this.settings.get(input.kind);

    if (!current) {
      throw new Error(`Integration ${input.kind} was not found`);
    }

    const mode = input.mode ?? current.mode;
    const enabled = input.enabled ?? current.enabled;
    const next: IntegrationSetting = {
      ...current,
      mode,
      enabled,
      status: enabled ? (mode === "adapter" ? "needs_config" : "healthy") : "disabled"
    };

    this.settings.set(input.kind, next);
    return clone(next);
  }

  async testIntegration(kind: IntegrationSetting["kind"]): Promise<TestIntegrationResponse> {
    const current = this.settings.get(kind);

    if (!current) {
      throw new Error(`Integration ${kind} was not found`);
    }

    const checkedAt = new Date().toISOString();
    const next: IntegrationSetting = {
      ...current,
      lastCheck: checkedAt,
      status: current.enabled ? "healthy" : "disabled"
    };

    this.settings.set(kind, next);
    return {
      integration: clone(next),
      checkedAt,
      sampleAccepted: current.enabled
    };
  }

  async resetDemo(): Promise<DemoResetResponse> {
    const incidentsCleared = this.incidents.size;
    this.incidents.clear();
    this.settings = new Map(defaultIntegrationSettings.map((setting) => [setting.kind, clone(setting)]));

    return {
      ok: true,
      incidentsCleared,
      integrationsReset: this.settings.size,
      timestamp: new Date().toISOString()
    };
  }
}
