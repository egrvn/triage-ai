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
      summary: `${incident.serviceName} shows a sharp HTTP 5xx increase after a recent release. The strongest correlated signal is the deploy ${deploy.branch} followed by payment errors in logs.`,
      affectedServices: [incident.serviceName, ...new Set(incident.logs.filter((log) => log.serviceName !== incident.serviceName).map((log) => log.serviceName))],
      hypothesis: `Most likely root cause is a regression in ${deploy.branch}: the changed retry/timeout behavior is causing upstream payment failures.`,
      confidence: retryLog ? "high" : "medium",
      reasoning: [
        "The error-rate metric breached the incident threshold after a stable baseline.",
        "A deploy for the affected service happened within the same short time window.",
        retryLog ? "Logs mention retry/timeouts that match the deploy summary." : "There are no direct exception logs, so confidence is not high."
      ],
      nextStep: "Validate the deploy diff and rollback payment-svc to the previous stable version if the regression is confirmed.",
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
      summary: `${incident.serviceName} is degraded because a downstream dependency is timing out. Metrics and logs point to the external loyalty API rather than an application deploy.`,
      affectedServices: [incident.serviceName],
      hypothesis: "Most likely root cause is an external dependency outage or latency spike in loyalty-api.",
      confidence: dependencyLog ? "high" : "medium",
      reasoning: [
        "External API error rate is materially above the threshold.",
        "Logs contain dependency timeout/circuit-breaker messages.",
        "The available deploy event is older and has weak correlation."
      ],
      nextStep: "Open the dependency runbook, switch checkout to degraded mode if available, and notify the owning integration team.",
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
      summary: `${incident.serviceName} has a latency degradation under load. CPU and queue pressure suggest resource saturation or an expensive query path.`,
      affectedServices: [incident.serviceName],
      hypothesis: "Most likely root cause is performance saturation in the search/catalog path, not a direct release regression.",
      confidence: "medium",
      reasoning: [
        "p95 latency crossed the response-time threshold.",
        "CPU pressure and queue backlog rose in the same window.",
        "No strong deploy correlation is present in the last few minutes."
      ],
      nextStep: "Check slow-query traces for the affected route and temporarily scale catalog workers or reduce cache-miss pressure.",
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
    summary: `There is an alert for ${incident.serviceName}, but the current context is too sparse to form a reliable root-cause hypothesis.`,
    affectedServices: [incident.serviceName],
    hypothesis: "No confident root cause. Start with manual validation of service health, recent changes, and user impact.",
    confidence: "low",
    reasoning: [
      "The metric values do not cross a strong rule threshold.",
      "There is no recent deploy correlation.",
      "The available logs are not specific enough to justify a confident AI recommendation."
    ],
    nextStep: "Open the service dashboard and collect a wider time window before deciding on mitigation.",
    evidence: refs
  };
}
