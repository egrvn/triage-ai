import type { IncidentDetail, IncidentListItem, IncidentStatus, LogEvent } from "@triage-ai/shared";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Clock3,
  GitBranch,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  XCircle
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { confidenceLabel, formatClock, severityLabel, statusLabel } from "@/lib/labels";
import { roleCopy, type IncidentTrendPoint, type RoleMode } from "./incident-workspace";

export function includesQuery(value: string | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query);
}

export function actionLabel(status: IncidentStatus) {
  if (status === "acknowledged") return "Принят в работу";
  if (status === "escalated") return "Эскалирован";
  if (status === "resolved") return "Закрыт";
  return "Активен";
}

function evidenceKindLabel(kind: "metric" | "log" | "deploy") {
  if (kind === "metric") return "метрика";
  if (kind === "log") return "лог";
  return "развертывание";
}

function evidenceTargetId(kind: "metric" | "log" | "deploy", refId: string) {
  if (kind === "metric") return `metric-${refId}`;
  if (kind === "log") return `log-${refId}`;
  return `deploy-${refId}`;
}

function scrollToEvidence(targetId: string) {
  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

type CopilotMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  citations: Array<{ id: string; label: string; targetId: string }>;
  confidence?: string;
  suggestedActions?: string[];
  auditId?: string;
};

const quickCommands = [
  "Объясни гипотезу",
  "Покажи ключевые логи",
  "Что изменилось перед инцидентом?",
  "Что проверить первым?",
  "Подготовь сводку для эскалации"
];

function buildCopilotAnswer(incident: IncidentDetail, command: string): CopilotMessage {
  const evidence = incident.analysis?.evidence ?? [];
  const topEvidence = evidence.slice(0, 3);
  const keyLogs = incident.logs.filter((log) => log.level === "error" || log.level === "warn").slice(0, 2);
  const keyMetrics = incident.metrics.slice(0, 2);
  const deploy = incident.deploys[0];
  const citations = [
    ...topEvidence.map((item) => ({
      id: item.id,
      label: item.title,
      targetId: evidenceTargetId(item.kind, item.refId)
    })),
    ...keyLogs.map((log) => ({
      id: log.id,
      label: `лог ${log.level}`,
      targetId: `log-${log.id}`
    })),
    ...keyMetrics.map((metric) => ({
      id: metric.id,
      label: metric.name,
      targetId: `metric-${metric.id}`
    }))
  ].slice(0, 4);
  const confidence = incident.analysis?.confidence ?? incident.confidence ?? "low";

  if (confidence === "low") {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Недостаточно сигналов для уверенной гипотезы. Я не буду утверждать root cause без подтверждения: проверьте дополнительные логи, метрики сервиса и последние deploy events вручную.",
      citations,
      confidence: confidenceLabel(confidence),
      suggestedActions: ["Собрать дополнительные логи", "Проверить недостающие метрики", "Передать контекст на эскалацию"],
      auditId: `audit-${Date.now().toString(36)}`
    };
  }

  const hypothesis = incident.analysis?.hypothesis ?? incident.hypothesis ?? "Гипотеза причины пока не сформирована.";
  const nextStep = incident.analysis?.nextStep ?? "Проверьте подтверждающие данные и выберите безопасное действие.";
  let content = `Гипотеза основана на текущем incident context: ${hypothesis}`;

  if (command.includes("логи")) {
    content = keyLogs.length
      ? `Ключевые логи указывают на деградацию ${incident.serviceName}: ${keyLogs.map((log) => log.message).join(" | ")}.`
      : "В текущем контексте нет error/warn логов. Проверьте ELK вручную и расширьте временное окно.";
  } else if (command.includes("изменилось")) {
    content = deploy
      ? `Перед инцидентом было развертывание ${deploy.version} из ветки ${deploy.branch}. Сопоставьте его timestamp с ростом метрик и burst логов.`
      : "В контексте нет deploy events. Проверьте историю развертываний вручную.";
  } else if (command.includes("проверить первым")) {
    content = `Первым шагом проверьте самое сильное evidence: ${topEvidence[0]?.title ?? keyMetrics[0]?.name ?? "метрики сервиса"}. Затем выполните действие: ${nextStep}`;
  } else if (command.includes("summary") || command.includes("сводк")) {
    content = `Сводка для эскалации: ${incident.title}. Сервис: ${incident.serviceName}. Гипотеза: ${hypothesis}. Следующий шаг: ${nextStep}`;
  }

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content,
    citations,
    confidence: confidenceLabel(confidence),
    suggestedActions: [nextStep, "Сверить timeline", "Зафиксировать handoff-контекст"],
    auditId: `audit-${Date.now().toString(36)}`
  };
}

function IncidentCopilotPanel({ incident }: { incident: IncidentDetail }) {
  const initialMessage = useMemo<CopilotMessage>(() => ({
    id: "initial",
    role: "assistant",
    content: `Я работаю только с контекстом ${incident.id}. Могу объяснить гипотезу, показать ключевые подтверждающие данные и подготовить сводку для эскалации.`,
    citations: [],
    confidence: incident.confidence ? confidenceLabel(incident.confidence) : undefined,
    auditId: `audit-${incident.id}`
  }), [incident.confidence, incident.id]);
  const [messages, setMessages] = useState<CopilotMessage[]>([initialMessage]);

  const ask = (command: string) => {
    const userMessage: CopilotMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: command,
      citations: []
    };
    const answer = buildCopilotAnswer(incident, command);
    setMessages((current) => [...current, userMessage, answer]);
  };

  return (
    <aside className="incident-copilot-panel" aria-label="AI-ассистент по инциденту">
      <div className="incident-copilot-panel__header">
        <div>
          <span className="eyebrow">Подтверждающие данные</span>
          <h2>AI-ассистент</h2>
          <p>Контекст: {incident.id}</p>
        </div>
        <Bot size={20} aria-hidden="true" />
      </div>

      <div className="copilot-commands" aria-label="Быстрые команды AI-ассистента">
        {quickCommands.map((command) => (
          <button key={command} type="button" onClick={() => ask(command)}>
            <MessageSquareText size={14} aria-hidden="true" />
            {command}
          </button>
        ))}
        <button type="button" disabled title="Roadmap">
          Сформируй черновик постмортема
        </button>
      </div>

      <div className="copilot-thread" aria-live="polite">
        {messages.map((message) => (
          <article key={message.id} className={`copilot-message ${message.role}`}>
            <p>{message.content}</p>
            {message.citations.length ? (
              <div className="copilot-citations">
                {message.citations.map((citation) => (
                  <button key={`${message.id}-${citation.id}`} type="button" onClick={() => scrollToEvidence(citation.targetId)}>
                    {citation.label}
                  </button>
                ))}
              </div>
            ) : null}
            {message.role === "assistant" ? (
              <footer>
                {message.confidence ? <span>{message.confidence}</span> : null}
                {message.auditId ? <code>{message.auditId}</code> : null}
              </footer>
            ) : null}
            {message.suggestedActions?.length ? (
              <ul>
                {message.suggestedActions.map((action) => <li key={action}>{action}</li>)}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </aside>
  );
}

export function MetricCard({ label, value, caption, icon }: { label: string; value: number; caption: string; icon: ReactNode }) {
  return (
    <article className="metric-card">
      <div className="metric-card__icon" aria-hidden="true">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{caption}</small>
      </div>
    </article>
  );
}

export function IncidentActions({
  incident,
  disabled,
  onStatus
}: {
  incident: Pick<IncidentListItem, "id" | "status">;
  disabled?: boolean;
  onStatus: (id: string, status: IncidentStatus) => void;
}) {
  return (
    <div className="incident-actions">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled || incident.status === "acknowledged" || incident.status === "resolved"}
        onClick={() => onStatus(incident.id, "acknowledged")}
      >
        <ClipboardCheck size={15} aria-hidden="true" />
        Принять в работу
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || incident.status === "escalated" || incident.status === "resolved"}
        onClick={() => onStatus(incident.id, "escalated")}
      >
        <ArrowUpRight size={15} aria-hidden="true" />
        Эскалировать
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled || incident.status === "resolved"}
        onClick={() => onStatus(incident.id, "resolved")}
      >
        <XCircle size={15} aria-hidden="true" />
        Закрыть
      </Button>
    </div>
  );
}

export function IncidentTrendChart({
  data,
  compact = false
}: {
  data: IncidentTrendPoint[];
  compact?: boolean;
}) {
  return (
    <section className={`ops-panel incident-chart-panel ${compact ? "compact" : ""}`}>
      <div className="panel-heading">
        <div>
          <h2>Динамика инцидентов</h2>
          <p>{compact ? "Краткая динамика после запусков сценариев." : "График обновляется после запуска сценариев и сбрасывается при обновлении данных."}</p>
        </div>
      </div>
      {data.length ? (
        <div className="incident-chart" aria-label="Динамика инцидентов">
          <ResponsiveContainer width="100%" height={compact ? 190 : 360}>
            <AreaChart data={data} margin={{ top: 12, right: 18, bottom: compact ? 0 : 34, left: -16 }}>
              <defs>
                <linearGradient id={`criticalGradient-${compact ? "mini" : "full"}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-4)" stopOpacity={0.34} />
                  <stop offset="95%" stopColor="var(--chart-4)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`analyzedGradient-${compact ? "mini" : "full"}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.42} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  color: "var(--popover-foreground)"
                }}
                labelFormatter={(label) => `Время: ${label}`}
                formatter={(value, name) => [value, name]}
              />
              {!compact ? <Legend formatter={(value) => value} /> : null}
              <Area type="monotone" dataKey="critical" name="Критичные" stroke="var(--chart-4)" fill={`url(#criticalGradient-${compact ? "mini" : "full"})`} strokeWidth={2} />
              <Area type="monotone" dataKey="warning" name="Средние" stroke="var(--chart-2)" fill="transparent" strokeWidth={2} />
              <Area type="monotone" dataKey="lowConfidence" name="Низкая уверенность" stroke="var(--chart-3)" fill="transparent" strokeWidth={2} />
              <Area type="monotone" dataKey="analyzed" name="Проанализировано ИИ" stroke="var(--chart-1)" fill={`url(#analyzedGradient-${compact ? "mini" : "full"})`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState
          title="Динамика пока не построена"
          description="Запустите демонстрационный сценарий, чтобы увидеть динамику инцидентов."
        />
      )}
    </section>
  );
}

export function IncidentSummaryCard({
  incident,
  active,
  onSelect,
  onStatus,
  statusBusy
}: {
  incident: IncidentListItem;
  active?: boolean;
  onSelect: () => void;
  onStatus: (id: string, status: IncidentStatus) => void;
  statusBusy?: boolean;
}) {
  return (
    <article className={`incident-row ${active ? "active" : ""}`}>
      <button type="button" className="incident-row__main" onClick={onSelect}>
        <span>
          <strong>{incident.title}</strong>
          <small>{incident.serviceName} · {formatClock(incident.detectedAt)}</small>
        </span>
        <span className="incident-row__badges">
          <StatusPill tone={incident.severity}>{severityLabel(incident.severity)}</StatusPill>
          <StatusPill tone={incident.status}>{statusLabel(incident.status)}</StatusPill>
        </span>
      </button>
      <IncidentActions incident={incident} disabled={statusBusy} onStatus={onStatus} />
    </article>
  );
}

export function IncidentDetailSections({
  incident,
  role,
  onStatus,
  onFeedbackWrong,
  logs,
  statusBusy,
  workspaceMode = false
}: {
  incident?: IncidentDetail;
  role: RoleMode;
  onStatus: (id: string, status: IncidentStatus) => void;
  onFeedbackWrong?: (id: string) => void;
  logs?: LogEvent[];
  statusBusy?: boolean;
  workspaceMode?: boolean;
}) {
  const [explainOpen, setExplainOpen] = useState(workspaceMode);
  const [copyStatus, setCopyStatus] = useState("");

  if (!incident) {
    return (
      <section className="ops-panel incident-detail incident-detail--empty">
        <EmptyState
          title="Инцидентов пока нет"
          description="Запустите демонстрационный сценарий на панели управления, чтобы увидеть динамику, график и детали разбора."
        />
      </section>
    );
  }

  const analysis = incident.analysis;
  const copy = roleCopy[role];
  const latestDeploy = incident.deploys[0];
  const visibleLogs = logs ?? incident.logs;
  const escalationSummary = [
    `Инцидент: ${incident.title}`,
    `Сервис: ${incident.serviceName}`,
    `Статус: ${statusLabel(incident.status)}`,
    `Гипотеза: ${analysis?.hypothesis ?? incident.hypothesis ?? "не сформирована"}`,
    `Уверенность: ${incident.confidence ? confidenceLabel(incident.confidence) : "нет данных"}`,
    `Следующий шаг: ${analysis?.nextStep ?? "проверить evidence вручную"}`
  ].join("\n");

  const detail = (
    <section className={`ops-panel incident-detail incident-detail--analysis ${workspaceMode ? "incident-detail--workspace" : ""}`}>
      <div className="incident-header">
        <div>
          <span className="eyebrow">Детали инцидента</span>
          <h2>{incident.title}</h2>
          <p>{incident.serviceName} · обнаружен {formatClock(incident.detectedAt)}</p>
        </div>
        <div className="incident-header__badges">
          <StatusPill tone={incident.severity}>{severityLabel(incident.severity)}</StatusPill>
          <StatusPill tone={incident.status}>{statusLabel(incident.status)}</StatusPill>
          {incident.confidence ? <StatusPill tone={incident.confidence}>{confidenceLabel(incident.confidence)}</StatusPill> : null}
        </div>
      </div>

      <div className="incident-workspace-actions">
        <IncidentActions incident={incident} disabled={statusBusy} onStatus={onStatus} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onFeedbackWrong?.(incident.id);
            setCopyStatus("Feedback сохранён: гипотеза отмечена как неверная");
          }}
        >
          Гипотеза неверна
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            void navigator.clipboard?.writeText(escalationSummary);
            setCopyStatus("Summary скопирован для эскалации");
          }}
        >
          <Copy size={14} aria-hidden="true" />
          Скопировать сводку
        </Button>
      </div>
      {copyStatus ? <div className="inline-status small" role="status">{copyStatus}</div> : null}

      <div className="incident-analysis-tabs" aria-label="Разделы анализа">
        {["Сводка", "Хронология", "Метрики", "Логи", "Подтверждающие данные", "Действия"].map((item) => (
          <a key={item} href={`#incident-${item.toLowerCase().replace(/\s+/g, "-")}`}>{item}</a>
        ))}
      </div>

      <div className="analysis-grid" id="incident-сводка">
        <article className="analysis-card primary">
          <Sparkles size={18} aria-hidden="true" />
          <h3>Сводка ИИ</h3>
          <p>{analysis?.summary ?? incident.summary ?? "Сводка ИИ пока не сформирована."}</p>
        </article>
        <article className="analysis-card">
          <ShieldAlert size={18} aria-hidden="true" />
          <h3>Гипотеза причины</h3>
          <p>{analysis?.hypothesis ?? incident.hypothesis ?? "Недостаточно контекста для гипотезы причины."}</p>
        </article>
        <article className="analysis-card">
          <GitBranch size={18} aria-hidden="true" />
          <h3>Связь с развертыванием</h3>
          {latestDeploy ? (
            <p>Последнее развертывание: {latestDeploy.version} · {latestDeploy.branch} · {formatClock(latestDeploy.timestamp)}</p>
          ) : (
            <p>Контекст развертывания отсутствует. Проверьте логи и метрики вручную.</p>
          )}
        </article>
      </div>

      <div className="explainability-panel">
        <button type="button" onClick={() => setExplainOpen((open) => !open)} aria-expanded={explainOpen}>
          <Sparkles size={16} aria-hidden="true" />
          Объяснить гипотезу
        </button>
        {explainOpen ? (
          <div className="explainability-panel__body">
            <div>
              <h3>Почему система так считает</h3>
              <ul>
                {(analysis?.reasoning ?? ["Недостаточно reasoning-сигналов: проверьте метрики, логи и развертывания вручную."]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Ссылки на evidence</h3>
              <div className="copilot-citations">
                {(analysis?.evidence ?? []).slice(0, 5).map((item) => (
                  <button key={item.id} type="button" onClick={() => scrollToEvidence(evidenceTargetId(item.kind, item.refId))}>
                    {item.title}
                  </button>
                ))}
              </div>
              <p>Контр-сигналы: если сигнал неполный или confidence низкая, гипотеза требует ручной проверки и не считается доказанной причиной.</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="timeline-section" id="incident-timeline">
        <h3>Хронология</h3>
        {[...incident.deploys, ...incident.metrics, ...incident.logs]
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
          .map((event) => (
            <div
              key={event.id}
              id={"version" in event ? `deploy-${event.id}` : "name" in event ? `metric-${event.id}` : `log-${event.id}`}
              className="timeline-event"
            >
              <Clock3 size={14} aria-hidden="true" />
              <span>{formatClock(event.timestamp)}</span>
              <strong>{"version" in event ? "Развертывание" : "name" in event ? "Метрика" : "Лог"}</strong>
              <p>{"version" in event ? `${event.version} · ${event.branch}` : "name" in event ? `${event.name}: ${event.value} ${event.unit}` : event.message}</p>
            </div>
          ))}
      </div>

      <div className="timeline-grid">
        <article id="incident-метрики">
          <h3>Метрики</h3>
          {incident.metrics.map((metric) => (
            <div key={metric.id} id={`metric-row-${metric.id}`} className="timeline-row metric-row">
              <Clock3 size={14} aria-hidden="true" />
              <span>{formatClock(metric.timestamp)}</span>
              <strong>{metric.name}</strong>
              <em>{metric.value} {metric.unit}</em>
            </div>
          ))}
        </article>
        <article id="incident-логи">
          <h3>Логи</h3>
          <div className="log-list">
            {visibleLogs.map((log) => (
              <pre key={log.id} id={`log-row-${log.id}`}><code>[{formatClock(log.timestamp)}] {log.level.toUpperCase()} {log.message}</code></pre>
            ))}
            {!visibleLogs.length ? <p className="muted-copy">По текущим фильтрам логи не найдены.</p> : null}
          </div>
        </article>
      </div>

      <div className="evidence-section" id="incident-подтверждающие-данные">
        <div className="section-heading compact">
          <h3>Подтверждающие данные</h3>
          <p>Метрики, логи и контекст развертывания, которые поддерживают гипотезу.</p>
        </div>
        <div className="evidence-list">
          {(analysis?.evidence ?? []).map((item) => (
            <article key={item.id} id={`evidence-${item.id}`} className="evidence-card">
              <StatusPill tone={item.kind === "deploy" ? "adapter" : item.kind === "metric" ? "healthy" : "mock"}>{evidenceKindLabel(item.kind)}</StatusPill>
              <strong>{item.title}</strong>
              <p>{item.quote}</p>
              <small>вес {Math.round(item.weight * 100)}%</small>
            </article>
          ))}
        </div>
      </div>

      <div className="role-guidance" id="incident-действия">
        <div>
          <span className="eyebrow">{copy.title}</span>
          <p>{copy.hint}</p>
        </div>
        <ul>
          {(analysis?.nextStep ? [analysis.nextStep, ...copy.actions] : copy.actions).slice(0, 4).map((action) => (
            <li key={action}>
              <CheckCircle2 size={15} aria-hidden="true" />
              {action}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );

  if (workspaceMode) {
    return (
      <div className="incident-workspace-grid">
        {detail}
        <IncidentCopilotPanel incident={incident} />
      </div>
    );
  }

  return detail;
}
