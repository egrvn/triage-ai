import { Prisma, PrismaClient } from "@prisma/client";
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

function dateToIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeIncidentStatus(status: string): IncidentDetail["status"] {
  if (status === "active") return "new";
  if (status === "acknowledged") return "in_progress";
  if (status === "resolved") return "closed";
  if (status === "escalated") return "escalated";
  return "new";
}

function toPrismaIntegrationData(setting: IntegrationSetting) {
  return {
    kind: setting.kind,
    enabled: setting.enabled,
    mode: setting.mode,
    displayName: setting.displayName,
    status: setting.status,
    description: setting.description,
    lastCheck: setting.lastCheck ? new Date(setting.lastCheck) : undefined,
    samplePayload: toJsonValue(setting.samplePayload),
    productionRequirements: toJsonValue(setting.productionRequirements) ?? []
  };
}

function toIntegrationSetting(setting: {
  kind: string;
  enabled: boolean;
  mode: string;
  displayName: string;
  status: string;
  description: string;
  lastCheck: Date | null;
  samplePayload: unknown;
  productionRequirements: unknown;
}): IntegrationSetting {
  return {
    kind: setting.kind as IntegrationSetting["kind"],
    enabled: setting.enabled,
    mode: setting.mode as IntegrationSetting["mode"],
    displayName: setting.displayName,
    status: setting.status as IntegrationSetting["status"],
    description: setting.description,
    lastCheck: setting.lastCheck ? dateToIso(setting.lastCheck) : undefined,
    samplePayload: setting.samplePayload && typeof setting.samplePayload === "object"
      ? (setting.samplePayload as Record<string, unknown>)
      : undefined,
    productionRequirements: Array.isArray(setting.productionRequirements)
      ? setting.productionRequirements.map(String)
      : []
  };
}

export class PrismaIncidentRepository implements IncidentRepository {
  private chatMessages = new Map<string, IncidentChatMessage[]>();
  private escalationEvents = new Map<string, EscalationEvent[]>();
  private incidentEvents = new Map<string, IncidentEvent[]>();
  private incidentMeta = new Map<string, Partial<Pick<IncidentDetail, "acceptedAt" | "escalatedAt" | "closedAt" | "owner" | "escalationTarget" | "escalationReason" | "handoffSummary">>>();

  constructor(private readonly prisma = new PrismaClient()) {}

  private addEvent(incidentId: string, event: Omit<IncidentEvent, "id" | "at"> & { at?: string }): IncidentEvent {
    const nextEvent: IncidentEvent = {
      id: `evt-${nowId()}`,
      at: event.at ?? new Date().toISOString(),
      type: event.type,
      actor: event.actor,
      text: event.text
    };
    this.incidentEvents.set(incidentId, [...(this.incidentEvents.get(incidentId) ?? []), nextEvent]);
    return structuredClone(nextEvent);
  }

  private decorateDetail(incident: IncidentDetail): IncidentDetail {
    return {
      ...incident,
      ...(this.incidentMeta.get(incident.id) ?? {}),
      events: this.incidentEvents.get(incident.id) ?? []
    };
  }

  async listScenarios(): Promise<ScenarioSummary[]> {
    await this.ensureScenarios();
    const scenarios = await this.prisma.scenario.findMany({ orderBy: [{ recommended: "desc" }, { name: "asc" }] });
    return scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      incidentType: scenario.incidentType,
      serviceName: scenario.serviceName,
      description: scenario.description,
      recommended: scenario.recommended
    }));
  }

  async runScenario(scenarioId: string): Promise<IncidentDetail> {
    await this.ensureScenarios();
    const scenario = scenarioFixtures.find((candidate) => candidate.id === scenarioId);

    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} was not found`);
    }

    const incidentId = `inc-${scenario.id}-${nowId()}`;

    await this.prisma.incident.create({
      data: {
        id: incidentId,
        title: scenario.alert.title,
        serviceName: scenario.serviceName,
        severity: scenario.alert.severity,
        status: "new",
        startedAt: new Date(scenario.alert.startedAt),
        detectedAt: new Date(scenario.alert.detectedAt),
        scenarioId: scenario.id,
        metrics: {
          create: scenario.metrics.map((metric) => ({
            ...metric,
            id: `${incidentId}-${metric.id}`,
            timestamp: new Date(metric.timestamp)
          }))
        },
        logs: {
          create: scenario.logs.map((log) => ({
            ...log,
            id: `${incidentId}-${log.id}`,
            timestamp: new Date(log.timestamp)
          }))
        },
        deploys: {
          create: scenario.deploys.map((deploy) => ({
            ...deploy,
            id: `${incidentId}-${deploy.id}`,
            timestamp: new Date(deploy.timestamp)
          }))
        }
      }
    });

    const incident = await this.getIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} was not created`);
    }
    this.addEvent(incidentId, {
      type: "created",
      actor: "Triage AI",
      text: "Инцидент создан из демонстрационного сценария."
    });
    return this.decorateDetail(incident);
  }

  async ingestAlert(input: {
    serviceName: string;
    title: string;
    severity: "critical" | "warning" | "info";
    timestamp: string;
    labels: Record<string, string>;
  }): Promise<IncidentDetail> {
    const incident = await this.prisma.incident.create({
      data: {
        id: `inc-manual-${nowId()}`,
        title: input.title,
        serviceName: input.serviceName,
        severity: input.severity,
        status: "new",
        startedAt: new Date(input.timestamp),
        detectedAt: new Date(input.timestamp)
      }
    });

    const detail = {
      id: incident.id,
      title: incident.title,
      serviceName: incident.serviceName,
      severity: incident.severity as IncidentDetail["severity"],
      status: normalizeIncidentStatus(incident.status),
      startedAt: dateToIso(incident.startedAt),
      detectedAt: dateToIso(incident.detectedAt),
      metrics: [],
      logs: [],
      deploys: [],
      events: []
    };
    this.addEvent(incident.id, {
      type: "created",
      actor: "Triage AI",
      text: "Инцидент создан из входящего alert."
    });
    return this.decorateDetail(detail);
  }

  async ingestCustom(input: GenericIngest): Promise<IncidentDetail> {
    const serviceName = input.serviceName ?? input.service ?? "unknown-service";
    const timestamp = input.timestamp ? new Date(input.timestamp) : new Date();
    const incidentId = `inc-${input.source || "custom"}-${nowId()}`;
    const logs = input.logSnippet
      ? [{
          id: `${incidentId}-log-custom`,
          timestamp,
          serviceName,
          level: input.severity === "critical" ? "error" : "warn",
          message: input.logSnippet,
          source: input.source
        }]
      : [{
          id: `${incidentId}-log-message`,
          timestamp,
          serviceName,
          level: input.severity === "critical" ? "error" : "info",
          message: input.description ?? input.message,
          source: input.source
        }];

    await this.prisma.incident.create({
      data: {
        id: incidentId,
        title: input.title ?? input.message.slice(0, 120),
        serviceName,
        severity: input.severity,
        status: "new",
        startedAt: timestamp,
        detectedAt: timestamp,
        summary: input.description ?? input.message,
        metrics: input.metricSnippet ? {
          create: [{
            id: `${incidentId}-metric-custom`,
            timestamp,
            serviceName,
            name: "custom_signal_value",
            value: 1,
            unit: "signal",
            labels: { source: input.source, raw: input.metricSnippet.slice(0, 120), ...input.labels }
          }]
        } : undefined,
        logs: { create: logs },
        deploys: input.deployEvent ? {
          create: [{
            id: `${incidentId}-deploy-custom`,
            timestamp,
            serviceName,
            version: input.labels.version ?? "custom-event",
            branch: input.labels.branch ?? "custom-context",
            commitSha: input.labels.commitSha ?? "unknown",
            author: input.labels.author ?? input.source,
            summary: input.deployEvent
          }]
        } : undefined
      }
    });

    this.addEvent(incidentId, {
      type: "created",
      actor: input.source === "manual" ? "Дежурный инженер" : "Generic ingest",
      text: input.source === "manual"
        ? "Инцидент создан вручную через AI-ассистент."
        : "Инцидент создан через Generic ingest endpoint."
    });
    const incident = await this.getIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} was not created`);
    }
    return this.decorateDetail(incident);
  }

  async listIncidents(): Promise<IncidentListItem[]> {
    const incidents = await this.prisma.incident.findMany({ orderBy: { detectedAt: "desc" } });
    return incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      serviceName: incident.serviceName,
      severity: incident.severity as IncidentListItem["severity"],
      status: normalizeIncidentStatus(incident.status),
      startedAt: dateToIso(incident.startedAt),
      detectedAt: dateToIso(incident.detectedAt),
      ...(this.incidentMeta.get(incident.id) ?? {}),
      scenarioId: incident.scenarioId ?? undefined,
      summary: incident.summary ?? undefined,
      hypothesis: incident.hypothesis ?? undefined,
      confidence: (incident.confidence as IncidentListItem["confidence"]) ?? undefined
    }));
  }

  async getIncident(id: string): Promise<IncidentDetail | null> {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: { metrics: true, logs: true, deploys: true, evidence: true }
    });

    if (!incident) {
      return null;
    }

    const analysis = incident.summary && incident.hypothesis && incident.confidence && incident.nextStep
      ? {
          summary: incident.summary,
          affectedServices: [incident.serviceName],
          hypothesis: incident.hypothesis,
          confidence: incident.confidence as IncidentAnalysis["confidence"],
          reasoning: Array.isArray(incident.reasoning) ? incident.reasoning.map(String) : [],
          nextStep: incident.nextStep,
          evidence: incident.evidence.map((item) => ({
            id: item.id,
            kind: item.kind as IncidentAnalysis["evidence"][number]["kind"],
            refId: item.refId,
            title: item.title,
            quote: item.quote,
            weight: item.weight
          }))
        }
      : undefined;

    return this.decorateDetail({
      id: incident.id,
      title: incident.title,
      serviceName: incident.serviceName,
      severity: incident.severity as IncidentDetail["severity"],
      status: normalizeIncidentStatus(incident.status),
      startedAt: dateToIso(incident.startedAt),
      detectedAt: dateToIso(incident.detectedAt),
      scenarioId: incident.scenarioId ?? undefined,
      summary: incident.summary ?? undefined,
      hypothesis: incident.hypothesis ?? undefined,
      confidence: (incident.confidence as IncidentDetail["confidence"]) ?? undefined,
      metrics: incident.metrics.map((metric) => ({
        id: metric.id,
        timestamp: dateToIso(metric.timestamp),
        serviceName: metric.serviceName,
        name: metric.name,
        value: metric.value,
        unit: metric.unit,
        labels: metric.labels as Record<string, string>
      })),
      logs: incident.logs.map((log) => ({
        id: log.id,
        timestamp: dateToIso(log.timestamp),
        serviceName: log.serviceName,
        level: log.level as IncidentDetail["logs"][number]["level"],
        message: log.message,
        traceId: log.traceId ?? undefined,
        source: log.source
      })),
      deploys: incident.deploys.map((deploy) => ({
        id: deploy.id,
        timestamp: dateToIso(deploy.timestamp),
        serviceName: deploy.serviceName,
        version: deploy.version,
        branch: deploy.branch,
        commitSha: deploy.commitSha,
        author: deploy.author,
        summary: deploy.summary
      })),
      events: [],
      analysis
    });
  }

  async saveAnalysis(incidentId: string, analysis: IncidentAnalysis): Promise<IncidentDetail> {
    await this.prisma.$transaction([
      this.prisma.analysisEvidence.deleteMany({ where: { incidentId } }),
      this.prisma.incident.update({
        where: { id: incidentId },
        data: {
          summary: analysis.summary,
          hypothesis: analysis.hypothesis,
          confidence: analysis.confidence,
          reasoning: analysis.reasoning,
          nextStep: analysis.nextStep,
          evidence: {
            create: analysis.evidence.map((item) => ({ ...item }))
          }
        }
      })
    ]);

    const incident = await this.getIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} was not found`);
    }
    return incident;
  }

  async updateIncidentStatus(incidentId: string, input: UpdateIncidentStatus): Promise<IncidentDetail> {
    const current = await this.getIncident(incidentId);
    if (!current) {
      throw new Error(`Incident ${incidentId} was not found`);
    }
    const now = new Date().toISOString();
    const meta = this.incidentMeta.get(incidentId) ?? {};
    const nextMeta = { ...meta };

    if (input.status === "in_progress") {
      nextMeta.acceptedAt = now;
      nextMeta.owner = "Дежурный инженер";
      this.addEvent(incidentId, {
        type: current.status === "escalated" ? "returned_to_work" : "accepted",
        actor: "Дежурный инженер",
        text: current.status === "escalated"
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

    this.incidentMeta.set(incidentId, nextMeta);
    await this.prisma.incident.update({
      where: { id: incidentId },
      data: { status: input.status }
    });

    const incident = await this.getIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} was not found`);
    }
    return this.decorateDetail(incident);
  }

  async saveFeedback(incidentId: string, feedback: FeedbackRequest): Promise<FeedbackResponse> {
    const created = await this.prisma.incidentFeedback.create({
      data: {
        id: `fb-${nowId()}`,
        incidentId,
        usefulness: feedback.usefulness,
        hypothesisVerdict: feedback.hypothesisVerdict,
        correctedRootCause: feedback.correctedRootCause
      }
    });

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
      id: created.id,
      incidentId,
      createdAt: dateToIso(created.createdAt)
    };
  }

  async listChatMessages(incidentId: string): Promise<IncidentChatMessage[]> {
    const incident = await this.getIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} was not found`);
    }

    return structuredClone(this.chatMessages.get(incidentId) ?? []);
  }

  async saveChatMessage(message: IncidentChatMessage): Promise<IncidentChatMessage> {
    const incident = await this.getIncident(message.incidentId);
    if (!incident) {
      throw new Error(`Incident ${message.incidentId} was not found`);
    }

    const messages = this.chatMessages.get(message.incidentId) ?? [];
    messages.push(structuredClone(message));
    this.chatMessages.set(message.incidentId, messages);
    return structuredClone(message);
  }

  async listEscalations(incidentId: string): Promise<EscalationEvent[]> {
    const incident = await this.getIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} was not found`);
    }

    return structuredClone(this.escalationEvents.get(incidentId) ?? []);
  }

  async createEscalation(incidentId: string): Promise<EscalationResponse> {
    const incident = await this.getIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} was not found`);
    }

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
      evidenceRefs: (incident.analysis?.evidence ?? []).slice(0, 5).map((item) => item.id)
    };
    const events = this.escalationEvents.get(incidentId) ?? [];
    this.escalationEvents.set(incidentId, [...events, escalation]);
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
    const updated = await this.updateIncidentStatus(incidentId, { status: "escalated" });

    return { incident: updated, escalation: structuredClone(escalation) };
  }

  async recordHandoffCopied(incidentId: string): Promise<IncidentEvent> {
    const incident = await this.getIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} was not found`);
    }

    return this.addEvent(incidentId, {
      type: "handoff_copied",
      actor: "Дежурный инженер",
      text: "Handoff summary скопирован для передачи команде."
    });
  }

  async listIntegrations(): Promise<IntegrationSetting[]> {
    await this.ensureSettings();
    const settings = await this.prisma.integrationSetting.findMany({ orderBy: { kind: "asc" } });
    return settings.map(toIntegrationSetting);
  }

  async updateIntegration(input: UpdateIntegrationSetting): Promise<IntegrationSetting> {
    await this.ensureSettings();
    const current = await this.prisma.integrationSetting.findUnique({ where: { kind: input.kind } });
    if (!current) {
      throw new Error(`Integration ${input.kind} was not found`);
    }

    const mode = input.mode ?? current.mode;
    const enabled = input.enabled ?? current.enabled;

    const updated = await this.prisma.integrationSetting.update({
      where: { kind: input.kind },
      data: {
        mode,
        enabled,
        status: enabled ? (mode === "adapter" ? "needs_config" : "healthy") : "disabled"
      }
    });

    return toIntegrationSetting(updated);
  }

  async testIntegration(kind: IntegrationSetting["kind"]): Promise<TestIntegrationResponse> {
    await this.ensureSettings();
    const current = await this.prisma.integrationSetting.findUnique({ where: { kind } });
    if (!current) {
      throw new Error(`Integration ${kind} was not found`);
    }

    const checkedAt = new Date();
    const updated = await this.prisma.integrationSetting.update({
      where: { kind },
      data: {
        lastCheck: checkedAt,
        status: current.enabled ? "healthy" : "disabled"
      }
    });

    return {
      integration: toIntegrationSetting(updated),
      checkedAt: dateToIso(checkedAt),
      sampleAccepted: current.enabled
    };
  }

  async resetDemo(): Promise<DemoResetResponse> {
    const deleted = await this.prisma.incident.deleteMany();
    this.chatMessages.clear();
    this.escalationEvents.clear();
    this.incidentEvents.clear();
    this.incidentMeta.clear();
    for (const setting of defaultIntegrationSettings) {
      await this.prisma.integrationSetting.upsert({
        where: { kind: setting.kind },
        update: toPrismaIntegrationData(setting),
        create: toPrismaIntegrationData(setting)
      });
    }

    return {
      ok: true,
      incidentsCleared: deleted.count,
      integrationsReset: defaultIntegrationSettings.length,
      timestamp: new Date().toISOString()
    };
  }

  private async ensureScenarios() {
    for (const scenario of scenarioFixtures) {
      await this.prisma.scenario.upsert({
        where: { id: scenario.id },
        update: {
          name: scenario.name,
          incidentType: scenario.incidentType,
          serviceName: scenario.serviceName,
          description: scenario.description,
          recommended: scenario.recommended
        },
        create: {
          id: scenario.id,
          name: scenario.name,
          incidentType: scenario.incidentType,
          serviceName: scenario.serviceName,
          description: scenario.description,
          recommended: scenario.recommended
        }
      });
    }
  }

  private async ensureSettings() {
    for (const setting of defaultIntegrationSettings) {
      await this.prisma.integrationSetting.upsert({
        where: { kind: setting.kind },
        update: {},
        create: toPrismaIntegrationData(setting)
      });
    }
  }
}
