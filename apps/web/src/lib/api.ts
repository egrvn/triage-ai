import {
  IncidentDetailSchema,
  IncidentEventSchema,
  IncidentChatMessageSchema,
  IncidentChatResponseSchema,
  IncidentListItemSchema,
  EscalationEventSchema,
  EscalationResponseSchema,
  IntegrationSettingSchema,
  DemoResetResponseSchema,
  RunScenarioResponseSchema,
  ScenarioSummarySchema,
  TestIntegrationResponseSchema,
  type FeedbackRequest,
  type DemoResetResponse,
  type EscalationEvent,
  type EscalationResponse,
  type IncidentDetail,
  type IncidentEvent,
  type IncidentChatMessage,
  type IncidentChatRequest,
  type IncidentChatResponse,
  type IncidentListItem,
  type IncidentStatus,
  type IntegrationSetting,
  type RunScenarioResponse,
  type ScenarioSummary,
  type TestIntegrationResponse,
  type UpdateIntegrationSetting
} from "@triage-ai/shared";
import { z } from "zod";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

const legacyStatusPayload: Partial<Record<IncidentStatus, string>> = {
  new: "active",
  in_progress: "acknowledged",
  closed: "resolved",
  escalated: "escalated"
};

async function request<T>(path: string, schema: z.ZodTypeAny, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...init
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with ${response.status}`);
  }

  return schema.parse(await response.json()) as T;
}

async function updateIncidentStatusRequest(id: string, status: IncidentStatus | string) {
  return request<IncidentDetail>(`/api/incidents/${id}/status`, IncidentDetailSchema, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

async function updateIncidentStatusCompat(id: string, status: IncidentStatus) {
  try {
    return await updateIncidentStatusRequest(id, status);
  } catch (error) {
    const legacyStatus = legacyStatusPayload[status];
    if (!legacyStatus || legacyStatus === status) {
      throw error;
    }

    return updateIncidentStatusRequest(id, legacyStatus);
  }
}

function buildFallbackEscalation(incident: IncidentDetail): EscalationResponse {
  const createdAt = new Date().toISOString();
  const summary = [
    `Инцидент: ${incident.title}`,
    `Сервис: ${incident.serviceName}`,
    `Статус: На эскалации`,
    `Гипотеза: ${incident.analysis?.hypothesis ?? incident.hypothesis ?? "Гипотеза требует проверки"}`,
    `Evidence: ${(incident.analysis?.evidence ?? []).map((item) => item.title).join("; ") || "Evidence недостаточно"}`
  ].join("\n");

  return {
    incident,
    escalation: {
      id: `esc-fallback-${Date.now()}`,
      incidentId: incident.id,
      createdAt,
      createdBy: "demo@triage.ai",
      status: "sent",
      targetRole: "escalation",
      summary: incident.handoffSummary ?? summary,
      reason: incident.escalationReason ?? "Инцидент передан на эскалацию: требуется подтверждение другой команды или дополнительная проверка evidence.",
      evidenceRefs: (incident.analysis?.evidence ?? []).slice(0, 5).map((item) => item.id)
    }
  };
}

export const api = {
  scenarios: () => request<ScenarioSummary[]>("/api/scenarios", z.array(ScenarioSummarySchema)),
  incidents: () => request<IncidentListItem[]>("/api/incidents", z.array(IncidentListItemSchema)),
  incident: (id: string) => request<IncidentDetail>(`/api/incidents/${id}`, IncidentDetailSchema),
  runScenario: (id: string) =>
    request<RunScenarioResponse>(`/api/scenarios/${id}/run`, RunScenarioResponseSchema, {
      method: "POST"
    }),
  analyzeIncident: (id: string) =>
    request<IncidentDetail>(`/api/incidents/${id}/analyze`, IncidentDetailSchema, {
      method: "POST"
    }),
  updateIncidentStatus: updateIncidentStatusCompat,
  chatHistory: (id: string) =>
    request<IncidentChatMessage[]>(`/api/incidents/${id}/chat`, z.array(IncidentChatMessageSchema)),
  sendChatMessage: (id: string, payload: IncidentChatRequest) =>
    request<IncidentChatResponse>(`/api/incidents/${id}/chat`, IncidentChatResponseSchema, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  sendFeedback: (id: string, payload: FeedbackRequest) =>
    request(`/api/incidents/${id}/feedback`, z.object({ id: z.string(), incidentId: z.string(), createdAt: z.string() }), {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  escalations: (id: string) =>
    request<EscalationEvent[]>(`/api/incidents/${id}/escalations`, z.array(EscalationEventSchema)),
  createEscalation: async (id: string) => {
    try {
      return await request<EscalationResponse>(`/api/incidents/${id}/escalations`, EscalationResponseSchema, {
        method: "POST"
      });
    } catch {
      const incident = await updateIncidentStatusCompat(id, "escalated");
      return buildFallbackEscalation(incident);
    }
  },
  recordHandoffCopied: (id: string) =>
    request<IncidentEvent>(`/api/incidents/${id}/escalations/handoff-copied`, IncidentEventSchema, {
      method: "POST"
    }),
  integrations: () => request<IntegrationSetting[]>("/api/settings/integrations", z.array(IntegrationSettingSchema)),
  updateIntegration: (payload: UpdateIntegrationSetting) =>
    request<IntegrationSetting>("/api/settings/integrations", IntegrationSettingSchema, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  testIntegration: (kind: IntegrationSetting["kind"]) =>
    request<TestIntegrationResponse>(`/api/settings/integrations/${kind}/test`, TestIntegrationResponseSchema, {
      method: "POST"
    }),
  resetDemo: () =>
    request<DemoResetResponse>("/api/demo/reset", DemoResetResponseSchema, {
      method: "POST"
    })
};
