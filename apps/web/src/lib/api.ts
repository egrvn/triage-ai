import {
  IncidentDetailSchema,
  IncidentListItemSchema,
  IntegrationSettingSchema,
  RunScenarioResponseSchema,
  ScenarioSummarySchema,
  type FeedbackRequest,
  type IncidentDetail,
  type IncidentListItem,
  type IntegrationSetting,
  type RunScenarioResponse,
  type ScenarioSummary,
  type UpdateIntegrationSetting
} from "@coursework/shared";
import { z } from "zod";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, schema: z.ZodTypeAny, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with ${response.status}`);
  }

  return schema.parse(await response.json()) as T;
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
  sendFeedback: (id: string, payload: FeedbackRequest) =>
    request(`/api/incidents/${id}/feedback`, z.object({ id: z.string(), incidentId: z.string(), createdAt: z.string() }), {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  integrations: () => request<IntegrationSetting[]>("/api/settings/integrations", z.array(IntegrationSettingSchema)),
  updateIntegration: (payload: UpdateIntegrationSetting) =>
    request<IntegrationSetting>("/api/settings/integrations", IntegrationSettingSchema, {
      method: "PATCH",
      body: JSON.stringify(payload)
    })
};
