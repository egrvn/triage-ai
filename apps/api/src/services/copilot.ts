import type { IncidentChatMessage, IncidentChatRequest, IncidentCitation, IncidentDetail } from "@triage-ai/shared";

const nowId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function citationTarget(kind: "metric" | "log" | "deploy", id: string) {
  return `${kind}-${id}`;
}

function buildCitations(incident: IncidentDetail): IncidentCitation[] {
  const evidence = incident.analysis?.evidence ?? [];
  const evidenceCitations = evidence.slice(0, 3).map((item) => ({
    id: item.id,
    label: item.title,
    targetId: citationTarget(item.kind, item.refId),
    source: "evidence" as const
  }));

  const logCitations = incident.logs
    .filter((log) => log.level === "error" || log.level === "warn")
    .slice(0, 2)
    .map((log) => ({
      id: log.id,
      label: `${log.level}: ${log.serviceName}`,
      targetId: citationTarget("log", log.id),
      source: "log" as const
    }));

  const metricCitations = incident.metrics.slice(0, 2).map((metric) => ({
    id: metric.id,
    label: metric.name,
    targetId: citationTarget("metric", metric.id),
    source: "metric" as const
  }));

  const deployCitations = incident.deploys.slice(0, 1).map((deploy) => ({
    id: deploy.id,
    label: deploy.version,
    targetId: citationTarget("deploy", deploy.id),
    source: "deploy" as const
  }));

  return [...evidenceCitations, ...logCitations, ...metricCitations, ...deployCitations].slice(0, 5);
}

function detectIntent(command: string) {
  if (command.includes("лог") || command.includes("log") || command.includes("error")) return "logs";
  if (command.includes("перв") || command.includes("провер")) return "first_check";
  if (command.includes("rollback") || command.includes("откат")) return "rollback";
  if (command.includes("impact") || command.includes("сниз")) return "impact";
  if (command.includes("измен") || command.includes("deploy") || command.includes("развер")) return "deploy";
  if (command.includes("эскалац") || command.includes("handoff") || command.includes("summary") || command.includes("свод")) return "handoff";
  if (command.includes("evidence") || command.includes("доказ")) return "evidence";
  if (command.includes("постмортем") || command.includes("postmortem")) return "postmortem";
  if (command.includes("гипотез") || command.includes("почему")) return "explain";
  return "fallback";
}

function scenarioKind(incident: IncidentDetail) {
  const text = `${incident.scenarioId ?? ""} ${incident.title} ${incident.serviceName}`.toLowerCase();
  if (text.includes("low") || text.includes("низк") || text.includes("profile")) return "low_confidence";
  if (text.includes("external") || text.includes("timeout") || text.includes("checkout")) return "external_timeout";
  if (text.includes("latency") || text.includes("задерж") || text.includes("catalog")) return "latency";
  return "release_regression";
}

export function createUserChatMessage(incidentId: string, content: string): IncidentChatMessage {
  return {
    id: `chat-user-${nowId()}`,
    incidentId,
    role: "user",
    content,
    createdAt: new Date().toISOString(),
    citations: [],
    suggestedActions: []
  };
}

export function answerIncidentQuestion(incident: IncidentDetail, request: IncidentChatRequest): IncidentChatMessage {
  const raw = request.quickCommand ?? request.message;
  const command = raw.toLowerCase();
  const intent = detectIntent(command);
  const scenario = scenarioKind(incident);
  const citations = buildCitations(incident);
  const confidence = incident.analysis?.confidence ?? incident.confidence ?? "low";
  const hypothesis = incident.analysis?.hypothesis ?? incident.hypothesis;
  const nextStep = incident.analysis?.nextStep ?? "Проверьте подтверждающие данные и выберите безопасное действие.";
  const keyLogs = incident.logs.filter((log) => log.level === "error" || log.level === "warn").slice(0, 3);
  const latestDeploy = incident.deploys[0];

  let content = "Я отвечаю только по выбранному incident context и не использую данные вне этой карточки.";
  let suggestedActions = [nextStep, "Сверить timeline", "Зафиксировать handoff-контекст"];

  if (intent === "logs") {
    content = keyLogs.length
      ? `Ключевые логи связаны с payment flow и retry/timeout поведением: ${keyLogs.map((log, index) => `${index + 1}. ${log.message}`).join(" ")} Эти записи подтверждают, что проблема проявилась после изменения retry logic.`
      : "Ключевые логи: последние warn/error записи вокруг времени инцидента, записи по profile/session/request-id, а также события рядом с началом деградации. Полный список открывается в отдельном окне, краткая сводка отображается здесь.";
    suggestedActions = ["Открыть логи в карточке", "Сверить trace id", "Проверить соседние сервисы"];
  } else if (intent === "deploy") {
    content = latestDeploy
      ? `Перед инцидентом было развертывание ${latestDeploy.version} из ветки ${latestDeploy.branch}. Его timestamp совпадает с ростом метрик и burst логов в ${incident.serviceName}, поэтому deploy correlation считается сильным evidence.`
      : "В контексте нет deploy events. Без этого нельзя уверенно связать инцидент с релизом.";
    suggestedActions = ["Сравнить метрики до/после deploy", "Проверить diff", "Оценить rollback plan"];
  } else if (intent === "rollback") {
    if (scenario === "release_regression") {
      content = "Rollback стоит рассматривать, если после проверки логов подтвердится, что retry/timeout поведение появилось сразу после deploy и impact растёт. Сейчас гипотеза высокая, но решение должен подтвердить инженер.";
    } else {
      content = "Rollback не выглядит первым действием по текущему контексту. Сначала подтвердите, что изменение в приложении связано с деградацией, а не с нагрузкой или внешней зависимостью.";
    }
    suggestedActions = ["Проверить deploy diff", "Сравнить error-rate до/после", "Подготовить rollback plan"];
  } else if (intent === "impact") {
    if (scenario === "release_regression") {
      content = "Чтобы снизить impact, сначала проверьте последнее развертывание feat/retry-logic-v2 и сравните error-rate до и после deploy. Если рост HTTP 5xx подтверждается логами RetryBudgetExceeded и совпадает с timeline, безопасный следующий шаг — подготовить rollback payment-svc на предыдущую стабильную версию.";
    } else if (scenario === "latency") {
      content = "Чтобы снизить impact, сначала ограничьте тяжёлые запросы и проверьте saturation: p95 latency, CPU и queue depth. Если деградация растёт, включите rate limiting или временный fallback.";
    } else if (scenario === "external_timeout") {
      content = "Чтобы снизить impact, проверьте circuit breaker и timeout policy для внешнего API. Если downstream нестабилен, временно включите fallback и снизьте retry pressure на checkout-svc.";
    } else {
      content = "Недостаточно сигналов для уверенной гипотезы. Чтобы снизить impact без выдуманной причины, проверьте error-rate, latency, последние изменения сервиса и повторяющиеся ошибки в логах.";
    }
    suggestedActions = ["Оценить affected route", "Проверить saturation", "Сообщить статус команде"];
  } else if (intent === "first_check") {
    if (scenario === "release_regression") {
      content = "Сначала проверьте последнее развертывание feat/retry-logic-v2 и сравните рост HTTP 5xx до/после deploy. Самые сильные evidence: всплеск HTTP 5xx, связь с недавним развертыванием, релевантный error log.";
    } else if (scenario === "latency") {
      content = "Сначала проверьте p95 latency, CPU saturation и queue depth в catalog-svc. Если deploy-события не совпадают с началом деградации, фокусируйтесь на нагрузке и capacity.";
    } else if (scenario === "external_timeout") {
      content = "Сначала проверьте timeout/circuit-breaker логи checkout-svc и доступность внешнего loyalty API. Важно отделить проблему downstream dependency от изменений в checkout.";
    } else {
      content = "Недостаточно сигналов для уверенной гипотезы. Сначала расширьте временное окно логов, проверьте метрики сервиса и наличие deploy events.";
    }
    suggestedActions = ["Открыть strongest evidence", "Сверить timeline", "Зафиксировать следующий шаг"];
  } else if (intent === "handoff") {
    content = `Сводка для эскалации: ${incident.title}. Сервис: ${incident.serviceName}. Гипотеза: ${hypothesis ?? "не сформирована"}. Уверенность: ${confidence}. Evidence: ${(incident.analysis?.evidence ?? []).map((item) => item.title).slice(0, 3).join(", ") || "недостаточно evidence"}. Рекомендуемый следующий шаг: ${nextStep}`;
    suggestedActions = ["Скопировать сводку", "Показать evidence", "Отправить на эскалацию"];
  } else if (intent === "evidence") {
    content = confidence === "low"
      ? "Самые сильные evidence: совпадение времени симптомов с изменениями, устойчивый рост error/warn-метрик, повторяемость по одному endpoint/profile/request group, наличие свежего deploy/config change. Сейчас evidence слабые, поэтому confidence остаётся низкой."
      : `Ключевые доказательства: ${(incident.analysis?.evidence ?? []).map((item) => item.title).slice(0, 3).join(", ") || "в карточке недостаточно evidence"}. Проверьте их перед выбором действия.`;
    suggestedActions = ["Открыть evidence", "Сверить counter-signals", "Проверить confidence"];
  } else if (intent === "postmortem") {
    content = "Постмортем пока рано формировать: причина не подтверждена. Сначала нужно подтвердить impact, affected-сегмент, timeline, root cause и mitigation. После этого можно собрать postmortem.";
    suggestedActions = ["Подтвердить root cause", "Зафиксировать mitigation", "Собрать timeline"];
  } else if (intent === "explain") {
    content = confidence === "low"
      ? "Недостаточно сигналов для уверенной гипотезы. Значения метрик не пересекают сильный rule threshold, связи со свежим развертыванием нет, доступные логи недостаточно специфичны для уверенной рекомендации. Поэтому гипотеза требует ручной проверки и не считается доказанной причиной."
      : hypothesis
      ? `Гипотеза: ${hypothesis}. Система связывает её с текущими evidence: ${(incident.analysis?.evidence ?? []).map((item) => item.title).slice(0, 3).join(", ") || "подтверждающие данные не найдены"}. Это объяснение основано только на карточке инцидента.`
      : "Гипотеза пока не сформирована. Проверьте метрики, логи и deploy events вручную.";
  } else {
    content = "Такой запрос пока не обрабатывается скриптом. Ассистент работает только с контекстом выбранного инцидента: проверка гипотезы, метрики, логи, impact, rollback, evidence, эскалация и постмортем.";
    suggestedActions = ["Объяснить гипотезу", "Показать ключевые логи", "Подготовить сводку"];
  }

  return {
    id: `chat-assistant-${nowId()}`,
    incidentId: incident.id,
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
    citations,
    confidence,
    suggestedActions,
    auditId: `audit-${nowId()}`
  };
}
