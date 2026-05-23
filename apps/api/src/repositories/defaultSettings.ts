import type { IntegrationSetting } from "@coursework/shared";

export const defaultIntegrationSettings: IntegrationSetting[] = [
  {
    kind: "prometheus",
    enabled: true,
    mode: "mock",
    displayName: "Prometheus metrics",
    status: "healthy",
    description: "Mock Prometheus-compatible metric ingestion for demo scenarios."
  },
  {
    kind: "elk",
    enabled: true,
    mode: "mock",
    displayName: "ELK logs",
    status: "healthy",
    description: "Mock ELK-like log events with service, timestamp, level, and trace id."
  },
  {
    kind: "telegram",
    enabled: true,
    mode: "mock",
    displayName: "Telegram alerts",
    status: "healthy",
    description: "Mock notification text returned by scenario runner."
  },
  {
    kind: "slack",
    enabled: false,
    mode: "disabled",
    displayName: "Slack alerts",
    status: "disabled",
    description: "Adapter boundary reserved for Slack-compatible notifications."
  },
  {
    kind: "email",
    enabled: false,
    mode: "disabled",
    displayName: "Email alerts",
    status: "disabled",
    description: "Adapter boundary reserved for email incident notifications."
  },
  {
    kind: "llm",
    enabled: true,
    mode: "mock",
    displayName: "AI analysis provider",
    status: "healthy",
    description: "Deterministic rule-backed mock provider; cloud LLM keys are optional."
  }
];
