import type {
  FeedbackRequest,
  FeedbackResponse,
  DemoResetResponse,
  EscalationEvent,
  EscalationResponse,
  IncidentEvent,
  IncidentAnalysis,
  IncidentChatMessage,
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
  listChatMessages(incidentId: string): Promise<IncidentChatMessage[]>;
  saveChatMessage(message: IncidentChatMessage): Promise<IncidentChatMessage>;
  listEscalations(incidentId: string): Promise<EscalationEvent[]>;
  createEscalation(incidentId: string): Promise<EscalationResponse>;
  recordHandoffCopied(incidentId: string): Promise<IncidentEvent>;
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
