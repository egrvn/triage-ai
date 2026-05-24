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

export interface IncidentRepository {
  listScenarios(): Promise<ScenarioSummary[]>;
  runScenario(scenarioId: string): Promise<IncidentDetail>;
  listIncidents(): Promise<IncidentListItem[]>;
  getIncident(id: string): Promise<IncidentDetail | null>;
  saveAnalysis(incidentId: string, analysis: IncidentAnalysis): Promise<IncidentDetail>;
  updateIncidentStatus(incidentId: string, input: UpdateIncidentStatus): Promise<IncidentDetail>;
  saveFeedback(incidentId: string, feedback: FeedbackRequest): Promise<FeedbackResponse>;
  listIntegrations(): Promise<IntegrationSetting[]>;
  updateIntegration(input: UpdateIntegrationSetting): Promise<IntegrationSetting>;
  testIntegration(kind: IntegrationSetting["kind"]): Promise<TestIntegrationResponse>;
  resetDemo(): Promise<DemoResetResponse>;
  ingestAlert(input: {
    serviceName: string;
    title: string;
    severity: "critical" | "warning" | "info";
    timestamp: string;
    labels: Record<string, string>;
  }): Promise<IncidentDetail>;
}
