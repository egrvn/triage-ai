import type { DeployEvent, LogEvent, MetricPoint, ScenarioSummary, Severity } from "@triage-ai/shared";

export type ScenarioFixture = ScenarioSummary & {
  alert: {
    title: string;
    severity: Severity;
    startedAt: string;
    detectedAt: string;
  };
  metrics: MetricPoint[];
  logs: LogEvent[];
  deploys: DeployEvent[];
};

const base = "2026-05-23T09:";
const iso = (minute: string) => `${base}${minute}:00.000Z`;

export const scenarioFixtures: ScenarioFixture[] = [
  {
    id: "release-regression-5xx",
    name: "Регрессия после релиза: всплеск HTTP 5xx",
    incidentType: "Регрессия после релиза",
    serviceName: "payment-svc",
    description: "payment-svc начинает возвращать 7,3% HTTP 5xx через четыре минуты после развертывания feat/retry-logic-v2.",
    recommended: true,
    alert: {
      title: "Всплеск HTTP 5xx в payment-svc",
      severity: "critical",
      startedAt: iso("38"),
      detectedAt: iso("42")
    },
    metrics: [
      { id: "m-rel-1", timestamp: iso("30"), serviceName: "payment-svc", name: "http_5xx_rate", value: 0.006, unit: "ratio", labels: { route: "/payments/charge" } },
      { id: "m-rel-2", timestamp: iso("42"), serviceName: "payment-svc", name: "http_5xx_rate", value: 0.073, unit: "ratio", labels: { route: "/payments/charge" } },
      { id: "m-rel-3", timestamp: iso("42"), serviceName: "payment-svc", name: "p95_latency_ms", value: 1280, unit: "ms", labels: { route: "/payments/charge" } },
      { id: "m-rel-4", timestamp: iso("42"), serviceName: "payment-svc", name: "request_rate", value: 820, unit: "rpm", labels: { route: "/payments/charge" } }
    ],
    logs: [
      { id: "l-rel-1", timestamp: iso("41"), serviceName: "payment-svc", level: "error", message: "RetryBudgetExceeded: charge provider returned 503 after retry-logic-v2", traceId: "trc-pay-7842", source: "elk" },
      { id: "l-rel-2", timestamp: iso("42"), serviceName: "payment-svc", level: "error", message: "POST /payments/charge failed with upstream timeout after 3 retries", traceId: "trc-pay-7843", source: "elk" },
      { id: "l-rel-3", timestamp: iso("42"), serviceName: "gateway-svc", level: "warn", message: "payment-svc error ratio breached SLO burn threshold", traceId: "trc-pay-7842", source: "elk" }
    ],
    deploys: [
      { id: "d-rel-1", timestamp: iso("38"), serviceName: "payment-svc", version: "2026.05.23-rc.18", branch: "feat/retry-logic-v2", commitSha: "a81f3c9", author: "payments-team", summary: "Изменена политика повторов и обработка timeout у провайдера" },
      { id: "d-rel-2", timestamp: iso("08"), serviceName: "gateway-svc", version: "2026.05.23-rc.07", branch: "main", commitSha: "bb204ac", author: "platform-team", summary: "Очистка передачи заголовков" }
    ]
  },
  {
    id: "latency-under-load",
    name: "Рост задержки под нагрузкой",
    incidentType: "Падение производительности под нагрузкой",
    serviceName: "catalog-svc",
    description: "Высокая p95 latency, рост нагрузки на CPU и очередь во время пикового трафика без явного релизного триггера.",
    recommended: true,
    alert: {
      title: "Превышение p95 latency в catalog-svc",
      severity: "warning",
      startedAt: iso("15"),
      detectedAt: iso("20")
    },
    metrics: [
      { id: "m-lat-1", timestamp: iso("12"), serviceName: "catalog-svc", name: "p95_latency_ms", value: 620, unit: "ms", labels: { route: "/catalog/search" } },
      { id: "m-lat-2", timestamp: iso("20"), serviceName: "catalog-svc", name: "p95_latency_ms", value: 1840, unit: "ms", labels: { route: "/catalog/search" } },
      { id: "m-lat-3", timestamp: iso("20"), serviceName: "catalog-svc", name: "cpu_utilization", value: 0.87, unit: "ratio", labels: { pod: "catalog-7df" } },
      { id: "m-lat-4", timestamp: iso("20"), serviceName: "catalog-svc", name: "queue_depth", value: 142, unit: "items", labels: { queue: "search-index" } }
    ],
    logs: [
      { id: "l-lat-1", timestamp: iso("19"), serviceName: "catalog-svc", level: "warn", message: "Slow search query exceeded 1800ms; index=products; cache=miss", traceId: "trc-cat-1142", source: "elk" },
      { id: "l-lat-2", timestamp: iso("20"), serviceName: "catalog-svc", level: "warn", message: "Worker queue search-index backlog is growing", traceId: "trc-cat-1143", source: "elk" }
    ],
    deploys: [
      { id: "d-lat-1", timestamp: iso("01"), serviceName: "catalog-svc", version: "2026.05.23-rc.03", branch: "main", commitSha: "92cd11e", author: "catalog-team", summary: "Заголовки кеширования статических ресурсов" }
    ]
  },
  {
    id: "external-api-timeout",
    name: "Тайм-аут внешнего API",
    incidentType: "Проблемы интеграций",
    serviceName: "checkout-svc",
    description: "Запросы checkout деградируют из-за timeout внешнего loyalty API.",
    recommended: false,
    alert: {
      title: "Timeout зависимости checkout",
      severity: "critical",
      startedAt: iso("25"),
      detectedAt: iso("27")
    },
    metrics: [
      { id: "m-ext-1", timestamp: iso("27"), serviceName: "checkout-svc", name: "external_api_error_rate", value: 0.18, unit: "ratio", labels: { dependency: "loyalty-api" } },
      { id: "m-ext-2", timestamp: iso("27"), serviceName: "checkout-svc", name: "p95_latency_ms", value: 2150, unit: "ms", labels: { route: "/checkout" } }
    ],
    logs: [
      { id: "l-ext-1", timestamp: iso("26"), serviceName: "checkout-svc", level: "error", message: "loyalty-api request timed out after 2000ms", traceId: "trc-chk-5501", source: "elk" },
      { id: "l-ext-2", timestamp: iso("27"), serviceName: "checkout-svc", level: "error", message: "Circuit breaker open for loyalty-api", traceId: "trc-chk-5502", source: "elk" }
    ],
    deploys: [
      { id: "d-ext-1", timestamp: iso("04"), serviceName: "checkout-svc", version: "2026.05.23-rc.04", branch: "main", commitSha: "f4bb901", author: "checkout-team", summary: "Обновление текста валидации корзины" }
    ]
  },
  {
    id: "low-confidence-sparse-data",
    name: "Неполный сигнал и низкая уверенность",
    incidentType: "Недостаточно контекста",
    serviceName: "profile-svc",
    description: "Оповещение есть, но доступные метрики и логи не подтверждают уверенную гипотезу причины.",
    recommended: false,
    alert: {
      title: "Периодические ошибки profile-svc",
      severity: "warning",
      startedAt: iso("50"),
      detectedAt: iso("55")
    },
    metrics: [
      { id: "m-low-1", timestamp: iso("55"), serviceName: "profile-svc", name: "http_5xx_rate", value: 0.014, unit: "ratio", labels: { route: "/profile" } }
    ],
    logs: [
      { id: "l-low-1", timestamp: iso("55"), serviceName: "profile-svc", level: "warn", message: "Intermittent client disconnects observed", traceId: "trc-prf-101", source: "elk" }
    ],
    deploys: []
  }
];

export function getScenarioFixture(id: string): ScenarioFixture | undefined {
  return scenarioFixtures.find((scenario) => scenario.id === id);
}
