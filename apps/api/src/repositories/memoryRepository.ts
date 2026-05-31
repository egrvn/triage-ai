import type {
  FeedbackRequest,
  FeedbackResponse,
  DemoResetResponse,
  EscalationEvent,
  EscalationResponse,
  GenericIngest,
  IncidentAnalysis,
  IncidentChatMessage,
  IncidentDetail,
  IncidentEvent,
  IncidentListItem,
  IntegrationSetting,
  TestIntegrationResponse,
  ScenarioSummary,
  UpdateIncidentStatus,
  UpdateIntegrationSetting
} from "@triage-ai/shared";
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
    acceptedAt: incident.acceptedAt,
    escalatedAt: incident.escalatedAt,
    closedAt: incident.closedAt,
    owner: incident.owner,
    escalationTarget: incident.escalationTarget,
    escalationReason: incident.escalationReason,
    handoffSummary: incident.handoffSummary,
    scenarioId: incident.scenarioId,
    summary: incident.analysis?.summary ?? incident.summary,
    hypothesis: incident.analysis?.hypothesis ?? incident.hypothesis,
    confidence: incident.analysis?.confidence ?? incident.confidence
  };
}

export class MemoryIncidentRepository implements IncidentRepository {
  private incidents = new Map<string, IncidentDetail>();
  private settings = new Map(defaultIntegrationSettings.map((setting) => [setting.kind, clone(setting)]));
  private chatMessages = new Map<string, IncidentChatMessage[]>();
  private escalationEvents = new Map<string, EscalationEvent[]>();
  private incidentEvents = new Map<string, IncidentEvent[]>();
  private incidentMeta = new Map<string, Partial<Pick<IncidentDetail, "acceptedAt" | "escalatedAt" | "closedAt" | "owner" | "escalationTarget" | "escalationReason" | "handoffSummary">>>();

  private addEvent(incidentId: string, event: Omit<IncidentEvent, "id" | "at"> & { at?: string }): IncidentEvent {
    const nextEvent: IncidentEvent = {
      id: `evt-${nowId()}`,
      at: event.at ?? new Date().toISOString(),
      type: event.type,
      actor: event.actor,
      text: event.text
    };
    this.incidentEvents.set(incidentId, [...(this.incidentEvents.get(incidentId) ?? []), nextEvent]);
    return clone(nextEvent);
  }

  private withRuntimeState(incident: IncidentDetail): IncidentDetail {
    return {
      ...incident,
      ...(this.incidentMeta.get(incident.id) ?? {}),
      events: this.incidentEvents.get(incident.id) ?? []
    };
  }

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
      status: "new",
      startedAt: scenario.alert.startedAt,
      detectedAt: scenario.alert.detectedAt,
      scenarioId: scenario.id,
      metrics: scenario.metrics.map((metric) => ({ ...metric, id: `${incidentId}-${metric.id}` })),
      logs: scenario.logs.map((log) => ({ ...log, id: `${incidentId}-${log.id}` })),
      deploys: scenario.deploys.map((deploy) => ({ ...deploy, id: `${incidentId}-${deploy.id}` })),
      events: []
    };

    this.incidents.set(incidentId, incident);
    this.addEvent(incidentId, {
      type: "created",
      actor: "Triage AI",
      text: "Инцидент создан из демонстрационного сценария."
    });
    return clone(this.withRuntimeState(incident));
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
      status: "new",
      startedAt: input.timestamp,
      detectedAt: input.timestamp,
      metrics: [],
      logs: [],
      deploys: [],
      events: []
    };

    this.incidents.set(incidentId, incident);
    this.addEvent(incidentId, {
      type: "created",
      actor: "Triage AI",
      text: "Инцидент создан из входящего alert."
    });
    return clone(this.withRuntimeState(incident));
  }

  async ingestCustom(input: GenericIngest): Promise<IncidentDetail> {
    const serviceName = input.serviceName ?? input.service ?? "unknown-service";
    const timestamp = input.timestamp ?? new Date().toISOString();
    const incidentId = `inc-${input.source || "custom"}-${nowId()}`;
    const metric = input.metricSnippet
      ? [{
          id: `${incidentId}-metric-custom`,
          timestamp,
          serviceName,
          name: "custom_signal_value",
          value: 1,
          unit: "signal",
          labels: { source: input.source, raw: input.metricSnippet.slice(0, 120), ...input.labels }
        }]
      : [];
    const logs = input.logSnippet
      ? [{
          id: `${incidentId}-log-custom`,
          timestamp,
          serviceName,
          level: input.severity === "critical" ? "error" as const : "warn" as const,
          message: input.logSnippet,
          source: input.source
        }]
      : [{
          id: `${incidentId}-log-message`,
          timestamp,
          serviceName,
          level: input.severity === "critical" ? "error" as const : "info" as const,
          message: input.description ?? input.message,
          source: input.source
        }];
    const deploys = input.deployEvent
      ? [{
          id: `${incidentId}-deploy-custom`,
          timestamp,
          serviceName,
          version: input.labels.version ?? "custom-event",
          branch: input.labels.branch ?? "custom-context",
          commitSha: input.labels.commitSha ?? "unknown",
          author: input.labels.author ?? input.source,
          summary: input.deployEvent
        }]
      : [];
    const incident: IncidentDetail = {
      id: incidentId,
      title: input.title ?? input.message.slice(0, 120),
      serviceName,
      severity: input.severity,
      status: "new",
      startedAt: timestamp,
      detectedAt: timestamp,
      summary: input.description ?? input.message,
      metrics: metric,
      logs,
      deploys,
      events: []
    };

    this.incidents.set(incidentId, incident);
    this.addEvent(incidentId, {
      type: "created",
      actor: input.source === "manual" ? "Дежурный инженер" : "Generic ingest",
      text: input.source === "manual"
        ? "Инцидент создан вручную через AI-ассистент."
        : "Инцидент создан через Generic ingest endpoint."
    });
    return clone(this.withRuntimeState(incident));
  }

  async listIncidents(): Promise<IncidentListItem[]> {
    return [...this.incidents.values()]
      .toSorted((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
      .map((incident) => toListItem(this.withRuntimeState(incident)));
  }

  async getIncident(id: string): Promise<IncidentDetail | null> {
    return this.incidents.has(id) ? clone(this.withRuntimeState(this.incidents.get(id)!)) : null;
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
    return clone(this.withRuntimeState(nextIncident));
  }

  async updateIncidentStatus(incidentId: string, input: UpdateIncidentStatus): Promise<IncidentDetail> {
    const incident = this.incidents.get(incidentId);

    if (!incident) {
      throw new Error(`Incident ${incidentId} was not found`);
    }

    const previousStatus = incident.status;
    const now = new Date().toISOString();
    const meta = this.incidentMeta.get(incidentId) ?? {};
    const nextMeta = { ...meta };

    if (input.status === "in_progress") {
      nextMeta.acceptedAt = now;
      nextMeta.owner = "Дежурный инженер";
      this.addEvent(incidentId, {
        type: previousStatus === "escalated" ? "returned_to_work" : "accepted",
        actor: "Дежурный инженер",
        text: previousStatus === "escalated"
          ? "Инцидент возвращён в работу дежурному инженеру."
          : "Инцидент принят в работу дежурным инженером."
      });
    }

    if (input.status === "closed") {
      nextMeta.closedAt = now;
      this.addEvent(incidentId, {
        type: "closed",
        actor: "Дежурный инженер",
        text: "Инцидент закрыт после проверки контекста."
      });
    }

    const nextIncident: IncidentDetail = {
      ...incident,
      status: input.status
    };

    this.incidentMeta.set(incidentId, nextMeta);
    this.incidents.set(incidentId, nextIncident);
    return clone(this.withRuntimeState(nextIncident));
  }

  async saveFeedback(incidentId: string, feedback: FeedbackRequest): Promise<FeedbackResponse> {
    if (!this.incidents.has(incidentId)) {
      throw new Error(`Incident ${incidentId} was not found`);
    }

    if (feedback.hypothesisVerdict === "partially_correct") {
      this.addEvent(incidentId, {
        type: "feedback_recorded",
        actor: "Дежурный инженер",
        text: "Отмечено: нужно больше данных для подтверждения гипотезы."
      });
    }
    if (feedback.hypothesisVerdict === "incorrect") {
      this.addEvent(incidentId, {
        type: "feedback_recorded",
        actor: "Дежурный инженер",
        text: "Feedback сохранён: гипотеза отмечена как неверная."
      });
    }

    return {
      id: `fb-${nowId()}`,
      incidentId,
      createdAt: new Date().toISOString()
    };
  }

  async listChatMessages(incidentId: string): Promise<IncidentChatMessage[]> {
    if (!this.incidents.has(incidentId)) {
      throw new Error(`Incident ${incidentId} was not found`);
    }

    return (this.chatMessages.get(incidentId) ?? []).map(clone);
  }

  async saveChatMessage(message: IncidentChatMessage): Promise<IncidentChatMessage> {
    if (!this.incidents.has(message.incidentId)) {
      throw new Error(`Incident ${message.incidentId} was not found`);
    }

    const messages = this.chatMessages.get(message.incidentId) ?? [];
    messages.push(clone(message));
    this.chatMessages.set(message.incidentId, messages);
    return clone(message);
  }

  async listEscalations(incidentId: string): Promise<EscalationEvent[]> {
    if (!this.incidents.has(incidentId)) {
      throw new Error(`Incident ${incidentId} was not found`);
    }

    return (this.escalationEvents.get(incidentId) ?? []).map(clone);
  }

  async createEscalation(incidentId: string): Promise<EscalationResponse> {
    const incident = this.incidents.get(incidentId);

    if (!incident) {
      throw new Error(`Incident ${incidentId} was not found`);
    }

    const evidenceRefs = (incident.analysis?.evidence ?? []).slice(0, 5).map((item) => item.id);
    const now = new Date().toISOString();
    const escalationReason = "Низкая уверенность гипотезы или требуется подтверждение другой команды.";
    const escalationTarget = "Команда платформы / ответственная команда";
    const handoffSummary = [
      `Инцидент: ${incident.title}`,
      `Сервис: ${incident.serviceName}`,
      `Критичность: ${incident.severity}`,
      `Confidence: ${incident.analysis?.confidence ?? incident.confidence ?? "не указана"}`,
      `Гипотеза: ${incident.analysis?.hypothesis ?? incident.hypothesis ?? "Гипотеза не подтверждена"}`,
      `Impact: ${incident.analysis?.summary ?? incident.summary ?? "Impact требует проверки"}`,
      `Evidence: ${(incident.analysis?.evidence ?? []).map((item) => item.title).join("; ") || "Evidence недостаточно"}`
    ].join("\n");
    const escalation: EscalationEvent = {
      id: `esc-${nowId()}`,
      incidentId,
      createdAt: now,
      createdBy: "demo@triage.ai",
      status: "sent",
      targetRole: "escalation",
      summary: handoffSummary,
      reason: escalationReason,
      evidenceRefs
    };
    const nextIncident: IncidentDetail = { ...incident, status: "escalated" };
    const events = this.escalationEvents.get(incidentId) ?? [];

    this.incidentMeta.set(incidentId, {
      ...(this.incidentMeta.get(incidentId) ?? {}),
      escalatedAt: now,
      escalationTarget,
      escalationReason,
      handoffSummary
    });
    this.addEvent(incidentId, {
      type: "escalated",
      actor: "Дежурный инженер",
      text: "Инцидент передан на эскалацию с handoff summary, timeline и evidence."
    });
    this.incidents.set(incidentId, nextIncident);
    this.escalationEvents.set(incidentId, [...events, escalation]);
    return { incident: clone(this.withRuntimeState(nextIncident)), escalation: clone(escalation) };
  }

  async recordHandoffCopied(incidentId: string): Promise<IncidentEvent> {
    if (!this.incidents.has(incidentId)) {
      throw new Error(`Incident ${incidentId} was not found`);
    }

    return this.addEvent(incidentId, {
      type: "handoff_copied",
      actor: "Дежурный инженер",
      text: "Handoff summary скопирован для передачи команде."
    });
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
    this.chatMessages.clear();
    this.escalationEvents.clear();
    this.incidentEvents.clear();
    this.incidentMeta.clear();
    this.settings = new Map(defaultIntegrationSettings.map((setting) => [setting.kind, clone(setting)]));

    return {
      ok: true,
      incidentsCleared,
      integrationsReset: this.settings.size,
      timestamp: new Date().toISOString()
    };
  }
}
