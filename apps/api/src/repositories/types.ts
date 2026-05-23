import type {
  FeedbackRequest,
  FeedbackResponse,
  IncidentAnalysis,
  IncidentDetail,
  IncidentListItem,
  IntegrationSetting,
  ScenarioSummary,
  UpdateIntegrationSetting
} from "@coursework/shared";

export interface IncidentRepository {
  listScenarios(): Promise<ScenarioSummary[]>;
  runScenario(scenarioId: string): Promise<IncidentDetail>;
  listIncidents(): Promise<IncidentListItem[]>;
  getIncident(id: string): Promise<IncidentDetail | null>;
  saveAnalysis(incidentId: string, analysis: IncidentAnalysis): Promise<IncidentDetail>;
  saveFeedback(incidentId: string, feedback: FeedbackRequest): Promise<FeedbackResponse>;
  listIntegrations(): Promise<IntegrationSetting[]>;
  updateIntegration(input: UpdateIntegrationSetting): Promise<IntegrationSetting>;
  ingestAlert(input: {
    serviceName: string;
    title: string;
    severity: "critical" | "warning" | "info";
    timestamp: string;
    labels: Record<string, string>;
  }): Promise<IncidentDetail>;
}
