import type { IntegrationSetting } from "@coursework/shared";

export const defaultIntegrationSettings: IntegrationSetting[] = [
  {
    kind: "prometheus",
    enabled: true,
    mode: "mock",
    displayName: "Prometheus metrics",
    status: "healthy",
    description: "Mock Prometheus-compatible Metrics ingestion для demo scenarios.",
    lastCheck: "2026-05-23T09:42:00.000Z",
    samplePayload: {
      source: "prometheus",
      metric: "http_5xx_rate",
      service: "payment-svc",
      value: 0.073,
      labels: { route: "/payments/charge" }
    },
    productionRequirements: ["Prometheus endpoint", "read-only API Token", "network allowlist", "SLO alert rules"]
  },
  {
    kind: "elk",
    enabled: true,
    mode: "mock",
    displayName: "ELK logs",
    status: "healthy",
    description: "Mock ELK-like Logs с service, timestamp, level и trace id.",
    lastCheck: "2026-05-23T09:42:00.000Z",
    samplePayload: {
      source: "elk",
      service: "payment-svc",
      level: "error",
      message: "RetryBudgetExceeded",
      traceId: "trc-pay-7842"
    },
    productionRequirements: ["ELK endpoint", "index pattern", "service account", "secrets management"]
  },
  {
    kind: "telegram",
    enabled: true,
    mode: "mock",
    displayName: "Telegram alerts",
    status: "healthy",
    description: "Mock Alerts для on-call уведомлений из scenario runner.",
    lastCheck: "2026-05-23T09:42:00.000Z",
    samplePayload: {
      channel: "telegram",
      text: "[CRITICAL] HTTP 5xx spike on payment-svc",
      deepLink: "/dashboard"
    },
    productionRequirements: ["Telegram bot Token", "chat id", "notification policy", "secrets management"]
  },
  {
    kind: "slack",
    enabled: false,
    mode: "disabled",
    displayName: "Slack alerts",
    status: "disabled",
    description: "Adapter boundary для Slack-compatible incident notifications.",
    samplePayload: {
      channel: "slack",
      blocks: ["incident title", "AI summary", "recommended next steps"]
    },
    productionRequirements: ["Slack app", "Webhook URL", "workspace approval", "secrets management"]
  },
  {
    kind: "email",
    enabled: false,
    mode: "disabled",
    displayName: "Email alerts",
    status: "disabled",
    description: "Adapter boundary для email incident notifications.",
    samplePayload: {
      channel: "email",
      subject: "Incident summary",
      recipients: ["on-call@example.com"]
    },
    productionRequirements: ["SMTP endpoint", "sender identity", "recipient groups", "secrets management"]
  },
  {
    kind: "llm",
    enabled: true,
    mode: "mock",
    displayName: "AI analysis provider",
    status: "healthy",
    description: "Deterministic rule-backed mock provider; cloud LLM keys optional для production adapter.",
    lastCheck: "2026-05-23T09:42:00.000Z",
    samplePayload: {
      provider: "mock",
      input: ["Metrics", "Logs", "Deployment context"],
      output: ["auto-summary", "root-cause hypothesis", "confidence"]
    },
    productionRequirements: ["approved AI provider", "API key", "data handling policy", "prompt/evaluation controls"]
  }
];
