import { z } from "zod";

export const SeveritySchema = z.enum(["critical", "warning", "info"]);
const CanonicalIncidentStatusSchema = z.enum(["new", "in_progress", "escalated", "closed"]);

export function normalizeIncidentStatusValue(value: unknown): unknown {
  if (value === "active") return "new";
  if (value === "acknowledged") return "in_progress";
  if (value === "resolved") return "closed";
  return value;
}

export const IncidentStatusSchema = z.preprocess(normalizeIncidentStatusValue, CanonicalIncidentStatusSchema);
export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export const EvidenceKindSchema = z.enum(["metric", "log", "deploy"]);
export const IntegrationKindSchema = z.enum(["prometheus", "elk", "telegram", "slack", "email", "llm"]);

export const MetricPointSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  serviceName: z.string(),
  name: z.string(),
  value: z.number(),
  unit: z.string(),
  labels: z.record(z.string()).default({})
});

export const LogEventSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  serviceName: z.string(),
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string(),
  traceId: z.string().optional(),
  source: z.string().default("elk")
});

export const DeployEventSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  serviceName: z.string(),
  version: z.string(),
  branch: z.string(),
  commitSha: z.string(),
  author: z.string(),
  summary: z.string()
});

export const EvidenceRefSchema = z.object({
  id: z.string(),
  kind: EvidenceKindSchema,
  refId: z.string(),
  title: z.string(),
  quote: z.string(),
  weight: z.number().min(0).max(1)
});

export const IncidentAnalysisSchema = z.object({
  summary: z.string(),
  affectedServices: z.array(z.string()),
  hypothesis: z.string(),
  confidence: ConfidenceSchema,
  reasoning: z.array(z.string()),
  nextStep: z.string(),
  evidence: z.array(EvidenceRefSchema)
});

export const ScenarioSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  incidentType: z.string(),
  serviceName: z.string(),
  description: z.string(),
  recommended: z.boolean().default(false)
});

export const IncidentListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  serviceName: z.string(),
  severity: SeveritySchema,
  status: IncidentStatusSchema,
  startedAt: z.string().datetime(),
  detectedAt: z.string().datetime(),
  acceptedAt: z.string().datetime().optional(),
  escalatedAt: z.string().datetime().optional(),
  closedAt: z.string().datetime().optional(),
  owner: z.string().optional(),
  escalationTarget: z.string().optional(),
  escalationReason: z.string().optional(),
  handoffSummary: z.string().optional(),
  scenarioId: z.string().optional(),
  summary: z.string().optional(),
  hypothesis: z.string().optional(),
  confidence: ConfidenceSchema.optional()
});

export const IncidentEventSchema = z.object({
  id: z.string(),
  type: z.enum(["created", "accepted", "escalated", "closed", "returned_to_work", "handoff_copied"]),
  at: z.string().datetime(),
  actor: z.string(),
  text: z.string()
});

export const IncidentDetailSchema = IncidentListItemSchema.extend({
  metrics: z.array(MetricPointSchema),
  logs: z.array(LogEventSchema),
  deploys: z.array(DeployEventSchema),
  events: z.array(IncidentEventSchema).default([]),
  analysis: IncidentAnalysisSchema.optional()
});

export const RunScenarioResponseSchema = z.object({
  incident: IncidentDetailSchema,
  notification: z.object({
    channel: z.enum(["telegram", "slack", "email"]),
    text: z.string(),
    deepLink: z.string()
  })
});

export const FeedbackRequestSchema = z.object({
  usefulness: z.enum(["useful", "not_useful"]),
  hypothesisVerdict: z.enum(["correct", "partially_correct", "incorrect", "unknown"]),
  correctedRootCause: z.string().max(500).optional()
});

export const FeedbackResponseSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  createdAt: z.string().datetime()
});

export const IncidentCitationSchema = z.object({
  id: z.string(),
  label: z.string(),
  targetId: z.string(),
  source: z.enum(["metric", "log", "deploy", "evidence"])
});

export const IncidentChatMessageSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.string().datetime(),
  citations: z.array(IncidentCitationSchema).default([]),
  confidence: ConfidenceSchema.optional(),
  suggestedActions: z.array(z.string()).default([]),
  auditId: z.string().optional()
});

export const IncidentChatRequestSchema = z.object({
  message: z.string().min(1).max(1200),
  quickCommand: z.string().max(120).optional()
});

export const IncidentChatResponseSchema = z.object({
  message: IncidentChatMessageSchema
});

export const EscalationEventSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  createdAt: z.string().datetime(),
  createdBy: z.string(),
  status: z.enum(["created", "sent", "acknowledged"]),
  targetRole: z.literal("escalation"),
  summary: z.string(),
  reason: z.string(),
  evidenceRefs: z.array(z.string()).default([])
});

export const EscalationResponseSchema = z.object({
  incident: IncidentDetailSchema,
  escalation: EscalationEventSchema
});

export const IntegrationSettingSchema = z.object({
  kind: IntegrationKindSchema,
  enabled: z.boolean(),
  mode: z.enum(["mock", "adapter", "disabled"]),
  displayName: z.string(),
  status: z.enum(["healthy", "needs_config", "disabled"]),
  description: z.string(),
  lastCheck: z.string().datetime().optional(),
  samplePayload: z.record(z.unknown()).optional(),
  productionRequirements: z.array(z.string()).default([])
});

export const UpdateIntegrationSettingSchema = z.object({
  kind: IntegrationKindSchema,
  enabled: z.boolean().optional(),
  mode: z.enum(["mock", "adapter", "disabled"]).optional()
});

export const UpdateIncidentStatusSchema = z.object({
  status: IncidentStatusSchema
});

export const DemoResetResponseSchema = z.object({
  ok: z.boolean(),
  incidentsCleared: z.number(),
  integrationsReset: z.number(),
  timestamp: z.string().datetime()
});

export const TestIntegrationResponseSchema = z.object({
  integration: IntegrationSettingSchema,
  checkedAt: z.string().datetime(),
  sampleAccepted: z.boolean()
});

export const AlertIngestSchema = z.object({
  serviceName: z.string(),
  title: z.string(),
  severity: SeveritySchema,
  timestamp: z.string().datetime(),
  labels: z.record(z.string()).default({})
});

export const MetricsIngestSchema = z.object({
  points: z.array(MetricPointSchema.omit({ id: true }))
});

export const LogsIngestSchema = z.object({
  events: z.array(LogEventSchema.omit({ id: true }))
});

export const DeploysIngestSchema = z.object({
  events: z.array(DeployEventSchema.omit({ id: true }))
});

export type Severity = z.infer<typeof SeveritySchema>;
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type EvidenceKind = z.infer<typeof EvidenceKindSchema>;
export type MetricPoint = z.infer<typeof MetricPointSchema>;
export type LogEvent = z.infer<typeof LogEventSchema>;
export type DeployEvent = z.infer<typeof DeployEventSchema>;
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;
export type IncidentAnalysis = z.infer<typeof IncidentAnalysisSchema>;
export type ScenarioSummary = z.infer<typeof ScenarioSummarySchema>;
export type IncidentListItem = z.infer<typeof IncidentListItemSchema>;
export type IncidentEvent = z.infer<typeof IncidentEventSchema>;
export type IncidentDetail = z.infer<typeof IncidentDetailSchema>;
export type RunScenarioResponse = z.infer<typeof RunScenarioResponseSchema>;
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;
export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>;
export type IncidentCitation = z.infer<typeof IncidentCitationSchema>;
export type IncidentChatMessage = z.infer<typeof IncidentChatMessageSchema>;
export type IncidentChatRequest = z.infer<typeof IncidentChatRequestSchema>;
export type IncidentChatResponse = z.infer<typeof IncidentChatResponseSchema>;
export type EscalationEvent = z.infer<typeof EscalationEventSchema>;
export type EscalationResponse = z.infer<typeof EscalationResponseSchema>;
export type IntegrationSetting = z.infer<typeof IntegrationSettingSchema>;
export type UpdateIntegrationSetting = z.infer<typeof UpdateIntegrationSettingSchema>;
export type UpdateIncidentStatus = z.infer<typeof UpdateIncidentStatusSchema>;
export type DemoResetResponse = z.infer<typeof DemoResetResponseSchema>;
export type TestIntegrationResponse = z.infer<typeof TestIntegrationResponseSchema>;
