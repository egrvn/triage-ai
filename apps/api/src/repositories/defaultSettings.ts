import type { IntegrationSetting } from "@triage-ai/shared";

export const defaultIntegrationSettings: IntegrationSetting[] = [
  {
    kind: "prometheus",
    enabled: true,
    mode: "mock",
    displayName: "Метрики Prometheus",
    status: "healthy",
    description: "Тестовый Prometheus-compatible ingestion метрик для демонстрационных сценариев.",
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
    displayName: "Логи ELK",
    status: "healthy",
    description: "Тестовые ELK-like логи с service, timestamp, level и trace id.",
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
    displayName: "Оповещения Telegram",
    status: "healthy",
    description: "Тестовые оповещения для дежурного инженера из runner демонстрационных сценариев.",
    lastCheck: "2026-05-23T09:42:00.000Z",
    samplePayload: {
      channel: "telegram",
      text: "[CRITICAL] Всплеск HTTP 5xx в payment-svc",
      deepLink: "/dashboard"
    },
    productionRequirements: ["Telegram bot Token", "chat id", "notification policy", "secrets management"]
  },
  {
    kind: "slack",
    enabled: false,
    mode: "disabled",
    displayName: "Оповещения Slack",
    status: "disabled",
    description: "Граница адаптера для Slack-compatible уведомлений об инцидентах.",
    samplePayload: {
      channel: "slack",
      blocks: ["название инцидента", "сводка ИИ", "рекомендуемые действия"]
    },
    productionRequirements: ["Slack app", "Webhook URL", "workspace approval", "secrets management"]
  },
  {
    kind: "email",
    enabled: false,
    mode: "disabled",
    displayName: "Email-оповещения",
    status: "disabled",
    description: "Граница адаптера для email-уведомлений об инцидентах.",
    samplePayload: {
      channel: "email",
      subject: "Сводка инцидента",
      recipients: ["on-call@example.com"]
    },
    productionRequirements: ["SMTP endpoint", "sender identity", "recipient groups", "secrets management"]
  },
  {
    kind: "llm",
    enabled: true,
    mode: "mock",
    displayName: "Провайдер анализа ИИ",
    status: "healthy",
    description: "Детерминированный тестовый provider на правилах; ключи cloud LLM нужны только для production adapter.",
    lastCheck: "2026-05-23T09:42:00.000Z",
    samplePayload: {
      provider: "test-mode",
      input: ["метрики", "логи", "контекст развертывания"],
      output: ["сводка", "гипотеза причины", "уверенность"]
    },
    productionRequirements: ["approved AI provider", "API key", "data handling policy", "prompt/evaluation controls"]
  }
];
