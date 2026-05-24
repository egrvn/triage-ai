import type { DeployEvent, EvidenceRef, IncidentAnalysis, IncidentDetail, LogEvent, MetricPoint } from "@triage-ai/shared";

const minutesBetween = (later: string, earlier: string) => {
  return (new Date(later).getTime() - new Date(earlier).getTime()) / 60000;
};

const latestMetric = (metrics: MetricPoint[], name: string) => {
  return metrics
    .filter((point) => point.name === name)
    .toSorted((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
};

const recentDeploy = (incident: IncidentDetail, maxMinutes = 24 * 60): DeployEvent | undefined => {
  return incident.deploys
    .filter((deploy) => minutesBetween(incident.detectedAt, deploy.timestamp) >= 0)
    .filter((deploy) => minutesBetween(incident.detectedAt, deploy.timestamp) <= maxMinutes)
    .toSorted((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
};

const errorLog = (logs: LogEvent[], matcher: RegExp) => {
  return logs.find((log) => log.level === "error" && matcher.test(log.message));
};

const evidence = (kind: EvidenceRef["kind"], refId: string, title: string, quote: string, weight: number): EvidenceRef => ({
  id: `ev-${kind}-${refId}`,
  kind,
  refId,
  title,
  quote,
  weight
});

export function analyzeIncident(incident: IncidentDetail): IncidentAnalysis {
  const fiveXx = latestMetric(incident.metrics, "http_5xx_rate");
  const latency = latestMetric(incident.metrics, "p95_latency_ms");
  const cpu = latestMetric(incident.metrics, "cpu_utilization");
  const queue = latestMetric(incident.metrics, "queue_depth");
  const externalApi = latestMetric(incident.metrics, "external_api_error_rate");
  const deploy = recentDeploy(incident, 24 * 60);

  const retryLog = errorLog(incident.logs, /retry|timeout|503/i);
  const dependencyLog = errorLog(incident.logs, /loyalty-api|circuit breaker|dependency|timed out/i);

  if (fiveXx && fiveXx.value >= 0.03 && deploy && minutesBetween(incident.detectedAt, deploy.timestamp) <= 10) {
    const refs: EvidenceRef[] = [
      evidence("metric", fiveXx.id, "Всплеск HTTP 5xx", `${fiveXx.name}=${(fiveXx.value * 100).toFixed(1)}% на момент ${fiveXx.timestamp}`, 0.95),
      evidence("deploy", deploy.id, "Связь с недавним развертыванием", `${deploy.branch} (${deploy.commitSha}) развернут за ${Math.round(minutesBetween(incident.detectedAt, deploy.timestamp))} мин до обнаружения`, 0.9)
    ];

    if (retryLog) {
      refs.push(evidence("log", retryLog.id, "Релевантный error log", retryLog.message, 0.82));
    }

    return {
      summary: `${incident.serviceName} показывает резкий рост HTTP 5xx после недавнего релиза. Самый сильный сигнал — развертывание ${deploy.branch}, после которого в логах появились ошибки payment flow.`,
      affectedServices: [incident.serviceName, ...new Set(incident.logs.filter((log) => log.serviceName !== incident.serviceName).map((log) => log.serviceName))],
      hypothesis: `Вероятная гипотеза причины — регрессия в ${deploy.branch}: изменение retry/timeout поведения вызывает upstream failures в payment flow.`,
      confidence: retryLog ? "high" : "medium",
      reasoning: [
        "Метрика error-rate превысила порог инцидента после стабильного baseline.",
        "Развертывание affected service произошло в том же коротком timeline window.",
        retryLog ? "Логи содержат retry/timeouts, которые совпадают с описанием развертывания." : "Прямых exception logs нет, поэтому уверенность не высокая."
      ],
      nextStep: "Проверьте diff развертывания и выполните rollback payment-svc на предыдущую стабильную версию, если регрессия подтвердится.",
      evidence: refs
    };
  }

  if (externalApi && externalApi.value >= 0.08) {
    const refs: EvidenceRef[] = [
      evidence("metric", externalApi.id, "Error rate внешней зависимости", `${externalApi.name}=${(externalApi.value * 100).toFixed(1)}%`, 0.9)
    ];

    if (dependencyLog) {
      refs.push(evidence("log", dependencyLog.id, "Лог timeout зависимости", dependencyLog.message, 0.86));
    }

    if (deploy) {
      refs.push(evidence("deploy", deploy.id, "Развертывание проверено", `${deploy.branch} есть в timeline, но оно недостаточно близко к событию, чтобы считать его основным триггером`, 0.35));
    }

    return {
      summary: `${incident.serviceName} деградирует из-за timeout downstream dependency. Метрики и логи указывают на внешний loyalty API, а не на свежее развертывание приложения.`,
      affectedServices: [incident.serviceName],
      hypothesis: "Вероятная гипотеза причины — outage или latency spike во внешней зависимости loyalty-api.",
      confidence: dependencyLog ? "high" : "medium",
      reasoning: [
        "External API error rate заметно выше порога.",
        "Логи содержат dependency timeout/circuit-breaker messages.",
        "Доступное развертывание старше и имеет слабую связь с событием."
      ],
      nextStep: "Откройте dependency runbook, переведите checkout в degraded mode, если он доступен, и уведомите ответственную integration team.",
      evidence: refs
    };
  }

  if (latency && latency.value >= 1000 && cpu && cpu.value >= 0.75) {
    const refs: EvidenceRef[] = [
      evidence("metric", latency.id, "Превышение latency", `${latency.name}=${latency.value}${latency.unit}`, 0.85),
      evidence("metric", cpu.id, "Нагрузка на CPU", `${cpu.name}=${Math.round(cpu.value * 100)}%`, 0.78)
    ];

    if (queue) {
      refs.push(evidence("metric", queue.id, "Рост очереди", `${queue.name}=${queue.value} ${queue.unit}`, 0.74));
    }

    return {
      summary: `${incident.serviceName} показывает рост задержки под нагрузкой. CPU и queue pressure указывают на resource saturation или дорогой query path.`,
      affectedServices: [incident.serviceName],
      hypothesis: "Вероятная гипотеза причины — performance saturation в search/catalog path, а не прямая регрессия релиза.",
      confidence: "medium",
      reasoning: [
        "p95 latency превысила response-time threshold.",
        "CPU pressure и queue backlog выросли в одном window.",
        "Сильной связи с развертыванием в последние минуты нет."
      ],
      nextStep: "Проверьте slow-query traces по affected route и временно масштабируйте catalog workers или снизьте cache-miss pressure.",
      evidence: refs
    };
  }

  const refs: EvidenceRef[] = incident.metrics.slice(0, 2).map((metric) =>
    evidence("metric", metric.id, "Доступная метрика", `${metric.name}=${metric.value}${metric.unit}`, 0.35)
  );

  refs.push(
    ...incident.logs.slice(0, 2).map((log) => evidence("log", log.id, "Доступный лог", log.message, 0.3))
  );

  return {
    summary: `Есть оповещение по ${incident.serviceName}, но текущий контекст слишком неполный для надежной гипотезы причины.`,
    affectedServices: [incident.serviceName],
    hypothesis: "Нет уверенной причины. Начните с ручной проверки service health, recent changes и user impact.",
    confidence: "low",
    reasoning: [
      "Значения метрик не пересекают сильный rule threshold.",
      "Связи со свежим развертыванием нет.",
      "Доступные логи недостаточно специфичны для уверенной рекомендации ИИ."
    ],
    nextStep: "Откройте панель сервиса и соберите более широкий time window перед выбором mitigation.",
    evidence: refs
  };
}
