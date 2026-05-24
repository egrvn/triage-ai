import { Prisma, PrismaClient } from "@prisma/client";
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
  constructor(private readonly prisma = new PrismaClient()) {}

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
        status: "active",
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
    return incident;
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
        status: "active",
        startedAt: new Date(input.timestamp),
        detectedAt: new Date(input.timestamp)
      }
    });

    return {
      id: incident.id,
      title: incident.title,
      serviceName: incident.serviceName,
      severity: incident.severity as IncidentDetail["severity"],
      status: incident.status as IncidentDetail["status"],
      startedAt: dateToIso(incident.startedAt),
      detectedAt: dateToIso(incident.detectedAt),
      metrics: [],
      logs: [],
      deploys: []
    };
  }

  async listIncidents(): Promise<IncidentListItem[]> {
    const incidents = await this.prisma.incident.findMany({ orderBy: { detectedAt: "desc" } });
    return incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      serviceName: incident.serviceName,
      severity: incident.severity as IncidentListItem["severity"],
      status: incident.status as IncidentListItem["status"],
      startedAt: dateToIso(incident.startedAt),
      detectedAt: dateToIso(incident.detectedAt),
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

    return {
      id: incident.id,
      title: incident.title,
      serviceName: incident.serviceName,
      severity: incident.severity as IncidentDetail["severity"],
      status: incident.status as IncidentDetail["status"],
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
      analysis
    };
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
    await this.prisma.incident.update({
      where: { id: incidentId },
      data: { status: input.status }
    });

    const incident = await this.getIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} was not found`);
    }
    return incident;
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

    return {
      id: created.id,
      incidentId,
      createdAt: dateToIso(created.createdAt)
    };
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
