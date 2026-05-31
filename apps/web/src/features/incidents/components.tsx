import type { IncidentDetail, IncidentEvent, IncidentListItem, IncidentStatus, LogEvent, MetricPoint } from "@triage-ai/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  CheckCircle2,
  ClipboardCheck,
  Copy,
  GitBranch,
  ShieldAlert,
  Sparkles,
  XCircle
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ConfidenceBadge, SeverityBadge, StatusBadge, StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { confidenceLabel, formatClock, statusLabel } from "@/lib/labels";
import { roleCopy, type IncidentTrendPoint, type RoleMode } from "./incident-workspace";
import { IncidentAssistantPanel } from "./assistant";

export function includesQuery(value: string | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query);
}

export function actionLabel(status: IncidentStatus) {
  if (status === "in_progress") return "В работе";
  if (status === "escalated") return "На эскалации";
  if (status === "closed") return "Закрыт";
  return "Новый";
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

function DetailDialog({
  title,
  summary,
  triggerLabel = "Подробнее",
  children
}: {
  title: string;
  summary: string;
  triggerLabel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialogId = `detail-dialog-${title.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-")}`;

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      {open ? (
        <div className="detail-dialog-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            className="detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogId}
            aria-describedby={`${dialogId}-summary`}
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
          >
            <div className="detail-dialog__header">
              <div>
                <span className="eyebrow">Детали</span>
                <h3 id={dialogId}>{title}</h3>
                <p id={`${dialogId}-summary`}>{summary}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Закрыть
              </Button>
            </div>
            <div className="detail-dialog__body">
              {children}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function MetricCard({ label, value, caption, icon }: { label: string; value: number; caption: string; icon: ReactNode }) {
  return (
    <article className="metric-card">
      <div className="metric-card__icon" aria-hidden="true">{icon}</div>
      <div className="metric-card__content">
        <span title={label}>{label}</span>
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
  if (incident.status === "closed") {
    return (
      <div className="incident-actions incident-actions--readonly">
        <span>Детали доступны для просмотра</span>
      </div>
    );
  }

  if (incident.status === "escalated") {
    return (
      <div className="incident-actions">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => onStatus(incident.id, "in_progress")}
        >
          <ClipboardCheck size={15} aria-hidden="true" />
          Вернуть в работу
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => onStatus(incident.id, "closed")}
        >
          <XCircle size={15} aria-hidden="true" />
          Закрыть
        </Button>
      </div>
    );
  }

  return (
    <div className="incident-actions">
      {incident.status === "new" ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => onStatus(incident.id, "in_progress")}
        >
          <ClipboardCheck size={15} aria-hidden="true" />
          Принять в работу
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => onStatus(incident.id, "escalated")}
      >
        <ArrowUpRight size={15} aria-hidden="true" />
        Эскалировать
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled}
        onClick={() => onStatus(incident.id, "closed")}
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
  const chartData = data.length
    ? data
    : [{ time: "baseline", critical: 0, warning: 0, lowConfidence: 0, analyzed: 0 }];

  return (
    <section className={`ops-panel incident-chart-panel ${compact ? "compact" : ""}`}>
      <div className="panel-heading">
        <div>
          <h2>Динамика инцидентов</h2>
          <p>{data.length
            ? (compact ? "Краткая динамика после запусков сценариев." : "График обновляется после запуска сценариев и сбрасывается при обновлении данных.")
            : "Baseline для демо-режима: динамика начнёт расти после запуска сценария."}</p>
        </div>
      </div>
      <div className="incident-chart" aria-label="Динамика инцидентов">
        <ResponsiveContainer width="100%" height={compact ? 190 : 360}>
          <AreaChart data={chartData} margin={{ top: 12, right: 18, bottom: compact ? 0 : 34, left: -16 }}>
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
          {incident.summary ? <em>{incident.summary}</em> : null}
        </span>
        <span className="incident-row__badges">
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </span>
        <span className="incident-row__open">Открыть</span>
      </button>
      <IncidentActions incident={incident} disabled={statusBusy} onStatus={onStatus} />
    </article>
  );
}

function evidenceChipLabel(title: string) {
  return title
    .replace("Связь с недавним развертыванием", "Связь с deploy")
    .replace("Релевантный error log", "Error log")
    .replace("Всплеск HTTP 5xx", "HTTP 5xx");
}

function MetricsPreview({ metrics }: { metrics: MetricPoint[] }) {
  return (
    <article className="data-preview-card" id="incident-metrics">
      <div className="data-preview-card__header">
        <div>
          <h3>Метрики</h3>
          <p>Короткий срез ключевых сигналов. Полная таблица открывается отдельно.</p>
        </div>
        <DetailDialog title="Метрики инцидента" summary="Полный список метрик выбранного инцидента." triggerLabel="Открыть метрики">
          <div className="data-table-scroll">
            <table className="incident-data-table">
              <thead>
                <tr>
                  <th>Время</th>
                  <th>Метрика</th>
                  <th>Значение</th>
                  <th>Единица</th>
                  <th>Контекст</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  <tr key={metric.id}>
                    <td><time>{formatClock(metric.timestamp)}</time></td>
                    <td><code title={metric.name}>{metric.name}</code></td>
                    <td><code>{metric.value}</code></td>
                    <td>{metric.unit}</td>
                    <td>{metric.serviceName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailDialog>
      </div>
      <div className="metrics-preview-list">
        {metrics.slice(0, 4).map((metric) => (
          <div key={metric.id} id={`metric-${metric.id}`} className="metric-preview-row">
            <time>{formatClock(metric.timestamp)}</time>
            <code title={metric.name}>{metric.name}</code>
            <strong>{metric.value} {metric.unit}</strong>
          </div>
        ))}
        {!metrics.length ? <p className="muted-copy">Метрики в карточке отсутствуют.</p> : null}
      </div>
    </article>
  );
}

function LogsPreview({ logs }: { logs: LogEvent[] }) {
  return (
    <article className="data-preview-card" id="incident-logs">
      <div className="data-preview-card__header">
        <div>
          <h3>Логи</h3>
          <p>Последние релевантные записи. Полный список открыт в отдельном окне.</p>
        </div>
        <DetailDialog title="Логи инцидента" summary="Полный список логов выбранного инцидента." triggerLabel="Открыть логи">
          <div className="log-dialog-list">
            {logs.map((log) => (
              <pre key={log.id} id={`log-dialog-${log.id}`}><code>[{formatClock(log.timestamp)}] {log.level.toUpperCase()} {log.serviceName}: {log.message}</code></pre>
            ))}
            {!logs.length ? <p className="muted-copy">По текущим фильтрам логи не найдены.</p> : null}
          </div>
        </DetailDialog>
      </div>
      <div className="log-preview-list">
        {logs.slice(0, 3).map((log) => (
          <div key={log.id} id={`log-${log.id}`} className="log-preview-row">
            <time>{formatClock(log.timestamp)}</time>
            <StatusPill tone={log.level === "error" ? "critical" : log.level === "warn" ? "warning" : "adapter"}>{log.level}</StatusPill>
            <code>{log.serviceName}</code>
            <span title={log.message}>{log.message}</span>
          </div>
        ))}
        {!logs.length ? <p className="muted-copy">По текущим фильтрам логи не найдены.</p> : null}
      </div>
    </article>
  );
}

function IncidentTimeline({
  incident
}: {
  incident: IncidentDetail;
}) {
  const incidentEventCopy: Record<IncidentEvent["type"], { type: string; title: string; source: string; tone: string }> = {
    created: {
      type: "Incident",
      title: "Инцидент создан",
      source: "system",
      tone: "metric"
    },
    accepted: {
      type: "User action",
      title: "Инцидент принят в работу",
      source: "on-call",
      tone: "ai"
    },
    escalated: {
      type: "Escalation",
      title: "Контекст передан на эскалацию",
      source: "handoff",
      tone: "escalation"
    },
    closed: {
      type: "User action",
      title: "Инцидент закрыт",
      source: "on-call",
      tone: "closed"
    },
    returned_to_work: {
      type: "User action",
      title: "Инцидент возвращён в работу",
      source: "escalation",
      tone: "ai"
    },
    handoff_copied: {
      type: "Handoff",
      title: "Handoff summary скопирован",
      source: "clipboard",
      tone: "escalation"
    },
    feedback_recorded: {
      type: "Feedback",
      title: "Feedback по гипотезе сохранён",
      source: "engineer",
      tone: "ai"
    }
  };
  const events = [
    ...incident.events.map((event) => {
      const copy = incidentEventCopy[event.type];
      return {
        id: `incident-event-${event.id}`,
        timestamp: event.at,
        type: copy.type,
        title: copy.title,
        description: event.text,
        source: copy.source,
        tone: copy.tone
      };
    }),
    ...incident.deploys.map((event) => ({
      id: `deploy-${event.id}`,
      timestamp: event.timestamp,
      type: "Deploy event",
      title: event.version,
      description: `${event.branch} · ${event.summary}`,
      source: "deploy",
      tone: "deploy"
    })),
    ...incident.metrics.map((event) => ({
      id: `timeline-metric-${event.id}`,
      timestamp: event.timestamp,
      type: "Metric spike",
      title: event.name,
      description: `${event.value} ${event.unit} · ${event.serviceName}`,
      source: "metric",
      tone: "metric"
    })),
    ...incident.logs.map((event) => ({
      id: `timeline-log-${event.id}`,
      timestamp: event.timestamp,
      type: "Log burst",
      title: event.level.toUpperCase(),
      description: event.message,
      source: event.source,
      tone: "log"
    })),
    ...(incident.analysis ? [{
      id: `analysis-${incident.id}`,
      timestamp: incident.detectedAt,
      type: "AI analysis",
      title: "AI-сводка сформирована",
      description: incident.analysis.hypothesis,
      source: "ai",
      tone: "ai"
    }] : []),
  ].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return (
    <section className="timeline-section" id="incident-timeline">
      <div className="section-heading compact">
        <h3>Хронология</h3>
        <p>Единая линия событий: deploy, метрики, логи, AI-анализ и действия инженера.</p>
      </div>
      <ol className="incident-timeline-list">
        {events.map((event) => (
          <li key={event.id} id={event.id} className={`incident-timeline-item ${event.tone}`}>
            <time>{formatClock(event.timestamp)}</time>
            <span className="timeline-dot" aria-hidden="true" />
            <article>
              <div>
                <StatusPill tone={event.tone === "escalation" ? "escalated" : event.tone === "closed" ? "closed" : event.tone === "deploy" ? "adapter" : event.tone === "log" ? "critical" : "healthy"}>{event.type}</StatusPill>
                <small>{event.source}</small>
              </div>
              <h4>{event.title}</h4>
              <p>{event.description}</p>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RoleGuidanceCard({
  role,
  nextStep
}: {
  role: RoleMode;
  nextStep?: string;
}) {
  const copy = roleCopy[role];
  const actions = (nextStep ? [nextStep, ...copy.actions] : copy.actions).slice(0, 4);

  return (
    <section className="role-guidance-card" id="incident-actions">
      <div className="role-guidance-card__header">
        <div className="metric-card__icon" aria-hidden="true">
          {role === "on-call" ? <ShieldAlert size={20} /> : <ClipboardCheck size={20} />}
        </div>
        <div>
          <span className="eyebrow">{copy.title}</span>
          <h3>{role === "on-call" ? "Сфокусируйтесь на impact и ближайшем безопасном действии" : "Передайте команде полный контекст и evidence"}</h3>
          <p>{copy.hint}</p>
        </div>
      </div>
      <ul>
        {actions.map((action) => (
          <li key={action}>
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{action}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EscalationSection({
  events,
  summary,
  copyBusy,
  onCopyHandoff
}: {
  events: IncidentEvent[];
  summary: string;
  copyBusy?: boolean;
  onCopyHandoff?: () => Promise<unknown> | void;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const escalationEvents = events.filter((event) =>
    event.type === "escalated" || event.type === "handoff_copied" || event.type === "returned_to_work"
  );

  return (
    <section className="escalation-section" id="incident-escalation">
      <div className="section-heading compact">
        <h3>События эскалации</h3>
        <p>Handoff-события, созданные из текущего incident context.</p>
      </div>
      {escalationEvents.length ? (
        <div className="escalation-list">
          {escalationEvents.map((event) => (
            <article key={event.id} className="escalation-card">
              <div className="escalation-card__header">
                <div>
                  <StatusBadge status="escalated" />
                  <time>{formatClock(event.at)}</time>
                </div>
                <StatusPill tone={event.type === "returned_to_work" ? "in_progress" : "escalated"}>
                  {event.type === "handoff_copied" ? "summary скопирован" : event.type === "returned_to_work" ? "возвращён" : "handoff"}
                </StatusPill>
              </div>
              <h4>{event.text}</h4>
              {event.type === "escalated" ? <pre><code>{summary}</code></pre> : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="muted-copy">Событий эскалации пока нет. Нажмите «Эскалировать», чтобы зафиксировать handoff-событие.</p>
      )}
      <div className="incident-actions">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={copyBusy}
          onClick={async () => {
            try {
              if (navigator.clipboard) {
                await navigator.clipboard.writeText(summary).catch(() => undefined);
              }
              await onCopyHandoff?.();
              setCopyStatus("Handoff summary скопирован");
            } catch {
              setCopyStatus("Не удалось скопировать автоматически.");
            }
          }}
        >
          <Copy size={14} aria-hidden="true" />
          Скопировать handoff summary
        </Button>
      </div>
      {copyStatus ? <div className="inline-status small" role="status">{copyStatus}</div> : null}
    </section>
  );
}

export function IncidentDetailSections({
  incident,
  role,
  onStatus,
  onFeedbackWrong,
  onFeedbackPartial,
  logs,
  statusBusy,
  workspaceMode = false
}: {
  incident?: IncidentDetail;
  role: RoleMode;
  onStatus: (id: string, status: IncidentStatus) => void;
  onFeedbackWrong?: (id: string) => void;
  onFeedbackPartial?: (id: string) => void;
  logs?: LogEvent[];
  statusBusy?: boolean;
  workspaceMode?: boolean;
}) {
  const [explainOpen, setExplainOpen] = useState(true);
  const [copyStatus, setCopyStatus] = useState("");
  const queryClient = useQueryClient();
  const handoffCopyMutation = useMutation({
    mutationFn: async () => {
      if (!incident) throw new Error("incident_not_selected");
      return api.recordHandoffCopied(incident.id);
    },
    onSuccess: () => {
      if (!incident) return;
      void queryClient.invalidateQueries({ queryKey: ["incident", incident.id] });
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      setCopyStatus("Handoff summary скопирован");
    },
    onError: () => setCopyStatus("Не удалось зафиксировать handoff-событие.")
  });

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
  const latestDeploy = incident.deploys[0];
  const visibleLogs = logs ?? incident.logs;
  const explainabilityEvidence = analysis?.evidence?.length
    ? analysis.evidence
    : [
      incident.metrics[0]
        ? { id: `fallback-metric-${incident.metrics[0].id}`, kind: "metric" as const, refId: incident.metrics[0].id, title: "Доступная метрика" }
        : null,
      visibleLogs[0]
        ? { id: `fallback-log-${visibleLogs[0].id}`, kind: "log" as const, refId: visibleLogs[0].id, title: "Доступный лог" }
        : null,
      latestDeploy
        ? { id: `fallback-deploy-${latestDeploy.id}`, kind: "deploy" as const, refId: latestDeploy.id, title: "Deploy correlation" }
        : null
    ].filter((item): item is { id: string; kind: "metric" | "log" | "deploy"; refId: string; title: string } => Boolean(item));
  const tabs = [
    { label: "Сводка", href: "#incident-summary" },
    { label: "Хронология", href: "#incident-timeline" },
    { label: "Метрики", href: "#incident-metrics" },
    { label: "Логи", href: "#incident-logs" },
    { label: "Evidence", href: "#incident-evidence" },
    { label: "Эскалация", href: "#incident-escalation" },
    { label: "Действия", href: "#incident-actions" }
  ];
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
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
          {incident.confidence ? <ConfidenceBadge confidence={incident.confidence} /> : null}
        </div>
      </div>

      <section className="incident-workspace-actions" aria-label="Действия по инциденту">
        <div className="incident-workspace-actions__group">
          <p>Основные действия</p>
          <IncidentActions incident={incident} disabled={statusBusy} onStatus={onStatus} />
        </div>
        <div className="incident-workspace-actions__group secondary">
          <p>Гипотеза и передача контекста</p>
          <div className="incident-actions">
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
              variant="outline"
              size="sm"
              title="Частично верна: требуется дополнительная проверка"
              onClick={() => {
                onFeedbackPartial?.(incident.id);
                setCopyStatus("Отмечено: требуется дополнительная проверка");
              }}
            >
              Нужно больше данных
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!navigator.clipboard) {
                  setCopyStatus("Clipboard недоступен: выделите сводку в деталях инцидента вручную");
                  return;
                }
                navigator.clipboard.writeText(escalationSummary)
                  .then(() => setCopyStatus("Summary скопирован для эскалации"))
                  .catch(() => setCopyStatus("Не удалось скопировать автоматически. Выделите сводку вручную."));
              }}
            >
              <Copy size={14} aria-hidden="true" />
              Скопировать сводку
            </Button>
          </div>
        </div>
      </section>
      {copyStatus ? <div className="inline-status small" role="status">{copyStatus}</div> : null}

      <div className="incident-analysis-tabs" aria-label="Разделы анализа">
        {tabs.map((item) => (
          <a key={item.href} href={item.href}>{item.label}</a>
        ))}
      </div>

      <section className={`deploy-correlation-callout ${latestDeploy ? "strong" : "neutral"}`} aria-label="Приоритет deploy correlation">
        <GitBranch size={18} aria-hidden="true" />
        <div>
          <div className="deploy-correlation-callout__header">
            <div>
              <span className="eyebrow">Deploy correlation</span>
              <h3>Связь с развертыванием</h3>
            </div>
            {latestDeploy ? <StatusPill tone="healthy">Сильный сигнал</StatusPill> : <StatusPill tone="mock">Сигнал не найден</StatusPill>}
          </div>
          {latestDeploy ? (
            <>
              <p>
                Развертывание <code>{latestDeploy.branch}</code> произошло перед обнаружением симптомов.
                Совпадение timeline, метрик и error logs делает deploy correlation ключевым evidence.
              </p>
              <dl>
                <div><dt>branch</dt><dd><code>{latestDeploy.branch}</code></dd></div>
                <div><dt>service</dt><dd><code>{latestDeploy.serviceName}</code></dd></div>
                <div><dt>deploy time</dt><dd>{formatClock(latestDeploy.timestamp)}</dd></div>
                <div><dt>evidence</dt><dd>метрики + логи + timeline</dd></div>
              </dl>
            </>
          ) : (
            <p>Свежего deploy event в контексте нет: гипотезу нужно подтверждать метриками, логами и ручной проверкой.</p>
          )}
        </div>
      </section>

      <section className="ai-summary-panel" id="incident-summary" aria-labelledby="ai-summary-title">
        <div className="section-heading compact">
          <span className="eyebrow">AI-сводка</span>
          <h3 id="ai-summary-title">Что важно понять в первые минуты</h3>
        </div>
        <div className="ai-summary-list">
          <article>
            <Sparkles size={18} aria-hidden="true" />
            <div>
              <h4>Что произошло</h4>
              <p>{analysis?.summary ?? incident.summary ?? "Сводка ИИ пока не сформирована."}</p>
            </div>
            <DetailDialog title="Что произошло" summary="Краткая AI-сводка по выбранному инциденту.">
              <p>{analysis?.summary ?? incident.summary ?? "Сводка ИИ пока не сформирована."}</p>
              <p>Сервис: <code>{incident.serviceName}</code>. Статус: {statusLabel(incident.status)}.</p>
            </DetailDialog>
          </article>
          <article>
            <ShieldAlert size={18} aria-hidden="true" />
            <div>
              <h4>Гипотеза причины</h4>
              <p>{analysis?.hypothesis ?? incident.hypothesis ?? "Недостаточно контекста для гипотезы причины."}</p>
            </div>
            <DetailDialog title="Гипотеза причины" summary="Почему система предлагает именно эту гипотезу.">
              <p>{analysis?.hypothesis ?? incident.hypothesis ?? "Недостаточно контекста для гипотезы причины."}</p>
              <ul>
                {(analysis?.reasoning ?? ["Недостаточно reasoning-сигналов: проверьте метрики, логи и развертывания вручную."]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </DetailDialog>
          </article>
          <article>
            <GitBranch size={18} aria-hidden="true" />
            <div>
              <h4>Связь с развертыванием</h4>
              {latestDeploy ? (
                <p>Последнее развертывание: <code>{latestDeploy.version}</code>, ветка <code>{latestDeploy.branch}</code>, {formatClock(latestDeploy.timestamp)}.</p>
              ) : (
                <p>Контекст развертывания отсутствует. Проверьте логи и метрики вручную.</p>
              )}
            </div>
            <DetailDialog title="Связь с развертыванием" summary="Deploy context и связь с timeline инцидента.">
              {latestDeploy ? (
                <dl className="dialog-data-list">
                  <div><dt>Версия</dt><dd><code>{latestDeploy.version}</code></dd></div>
                  <div><dt>Ветка</dt><dd><code>{latestDeploy.branch}</code></dd></div>
                  <div><dt>Commit</dt><dd><code>{latestDeploy.commitSha}</code></dd></div>
                  <div><dt>Summary</dt><dd>{latestDeploy.summary}</dd></div>
                </dl>
              ) : (
                <p>Deploy events в карточке отсутствуют.</p>
              )}
            </DetailDialog>
          </article>
        </div>
      </section>

      <div className="explainability-panel">
        <button type="button" onClick={() => setExplainOpen(true)} aria-expanded={explainOpen}>
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
              <div className="copilot-citations explainability-citations">
                {explainabilityEvidence.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={item.title}
                    onClick={() => scrollToEvidence(evidenceTargetId(item.kind, item.refId))}
                  >
                    {evidenceChipLabel(item.title)}
                  </button>
                ))}
              </div>
              <div className="counter-signal-callout">
                <strong>Контр-сигналы</strong>
                <p>Если сигнал неполный или confidence низкая, гипотеза требует ручной проверки и не считается доказанной причиной.</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <IncidentTimeline incident={incident} />

      <div className="timeline-grid">
        <MetricsPreview metrics={incident.metrics} />
        <LogsPreview logs={visibleLogs} />
      </div>

      <div className="evidence-section" id="incident-evidence">
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

      <EscalationSection
        events={incident.events}
        summary={incident.handoffSummary ?? escalationSummary}
        copyBusy={handoffCopyMutation.isPending}
        onCopyHandoff={() => handoffCopyMutation.mutateAsync()}
      />

      <RoleGuidanceCard role={role} nextStep={analysis?.nextStep} />
    </section>
  );

  if (workspaceMode) {
    return (
      <div className="incident-workspace-grid">
        {detail}
        <IncidentAssistantPanel incident={incident} role={role} compact />
      </div>
    );
  }

  return detail;
}
