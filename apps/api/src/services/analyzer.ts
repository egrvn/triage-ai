import type { DeployEvent, EvidenceRef, IncidentAnalysis, IncidentDetail, LogEvent, MetricPoint } from "@coursework/shared";

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
      evidence("metric", fiveXx.id, "HTTP 5xx spike", `${fiveXx.name}=${(fiveXx.value * 100).toFixed(1)}% at ${fiveXx.timestamp}`, 0.95),
      evidence("deploy", deploy.id, "Recent deploy correlation", `${deploy.branch} (${deploy.commitSha}) deployed ${Math.round(minutesBetween(incident.detectedAt, deploy.timestamp))} min before detection`, 0.9)
    ];

    if (retryLog) {
      refs.push(evidence("log", retryLog.id, "Relevant error log", retryLog.message, 0.82));
    }

    return {
      summary: `${incident.serviceName} показывает резкий рост HTTP 5xx после недавнего Release. Самый сильный signal — Deployment ${deploy.branch}, после которого в Logs появились ошибки payment flow.`,
      affectedServices: [incident.serviceName, ...new Set(incident.logs.filter((log) => log.serviceName !== incident.serviceName).map((log) => log.serviceName))],
      hypothesis: `Вероятная root-cause hypothesis — regression в ${deploy.branch}: изменение retry/timeout поведения вызывает upstream failures в payment flow.`,
      confidence: retryLog ? "high" : "medium",
      reasoning: [
        "Error-rate Metric превысила incident threshold после стабильного baseline.",
        "Deployment affected service произошел в том же коротком timeline window.",
        retryLog ? "Logs содержат retry/timeouts, которые совпадают с Deployment summary." : "Прямых exception Logs нет, поэтому confidence не high."
      ],
      nextStep: "Проверьте Deployment diff и выполните rollback payment-svc на предыдущую стабильную версию, если regression подтвердится.",
      evidence: refs
    };
  }

  if (externalApi && externalApi.value >= 0.08) {
    const refs: EvidenceRef[] = [
      evidence("metric", externalApi.id, "External dependency error rate", `${externalApi.name}=${(externalApi.value * 100).toFixed(1)}%`, 0.9)
    ];

    if (dependencyLog) {
      refs.push(evidence("log", dependencyLog.id, "Dependency timeout log", dependencyLog.message, 0.86));
    }

    if (deploy) {
      refs.push(evidence("deploy", deploy.id, "Deploy checked", `${deploy.branch} exists but is not close enough to be the primary trigger`, 0.35));
    }

    return {
      summary: `${incident.serviceName} деградирует из-за timeout downstream dependency. Metrics и Logs указывают на external loyalty API, а не на свежий application Deployment.`,
      affectedServices: [incident.serviceName],
      hypothesis: "Вероятная root-cause hypothesis — outage или latency spike во external dependency loyalty-api.",
      confidence: dependencyLog ? "high" : "medium",
      reasoning: [
        "External API error rate заметно выше threshold.",
        "Logs содержат dependency timeout/circuit-breaker messages.",
        "Доступный Deployment старше и имеет слабую correlation."
      ],
      nextStep: "Откройте dependency runbook, переведите checkout в degraded mode, если он доступен, и уведомите owning integration team.",
      evidence: refs
    };
  }

  if (latency && latency.value >= 1000 && cpu && cpu.value >= 0.75) {
    const refs: EvidenceRef[] = [
      evidence("metric", latency.id, "Latency breach", `${latency.name}=${latency.value}${latency.unit}`, 0.85),
      evidence("metric", cpu.id, "CPU pressure", `${cpu.name}=${Math.round(cpu.value * 100)}%`, 0.78)
    ];

    if (queue) {
      refs.push(evidence("metric", queue.id, "Queue backlog", `${queue.name}=${queue.value} ${queue.unit}`, 0.74));
    }

    return {
      summary: `${incident.serviceName} показывает latency degradation под нагрузкой. CPU и queue pressure указывают на resource saturation или дорогой query path.`,
      affectedServices: [incident.serviceName],
      hypothesis: "Вероятная root-cause hypothesis — performance saturation в search/catalog path, а не прямой release regression.",
      confidence: "medium",
      reasoning: [
        "p95 latency превысила response-time threshold.",
        "CPU pressure и queue backlog выросли в одном window.",
        "Сильной deploy correlation в последние минуты нет."
      ],
      nextStep: "Проверьте slow-query Traces по affected route и временно масштабируйте catalog workers или снизьте cache-miss pressure.",
      evidence: refs
    };
  }

  const refs: EvidenceRef[] = incident.metrics.slice(0, 2).map((metric) =>
    evidence("metric", metric.id, "Available metric", `${metric.name}=${metric.value}${metric.unit}`, 0.35)
  );

  refs.push(
    ...incident.logs.slice(0, 2).map((log) => evidence("log", log.id, "Available log", log.message, 0.3))
  );

  return {
    summary: `Есть Alert по ${incident.serviceName}, но текущий context слишком неполный для надежной root-cause hypothesis.`,
    affectedServices: [incident.serviceName],
    hypothesis: "Нет уверенной root cause. Начните с ручной проверки service health, recent changes и user impact.",
    confidence: "low",
    reasoning: [
      "Metric values не пересекают сильный rule threshold.",
      "Свежей deploy correlation нет.",
      "Доступные Logs недостаточно специфичны для уверенной AI recommendation."
    ],
    nextStep: "Откройте service Dashboard и соберите более широкий time window перед выбором mitigation.",
    evidence: refs
  };
}
