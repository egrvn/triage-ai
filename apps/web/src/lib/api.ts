import {
  IncidentDetailSchema,
  IncidentListItemSchema,
  IntegrationSettingSchema,
  DemoResetResponseSchema,
  RunScenarioResponseSchema,
  ScenarioSummarySchema,
  TestIntegrationResponseSchema,
  type FeedbackRequest,
  type DemoResetResponse,
  type IncidentDetail,
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
  updateIncidentStatus: (id: string, status: IncidentStatus) =>
    request<IncidentDetail>(`/api/incidents/${id}/status`, IncidentDetailSchema, {
      method: "PATCH",
      body: JSON.stringify({ status })
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
