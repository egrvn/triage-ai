import type { IncidentDetail, IncidentListItem, IncidentStatus } from "@triage-ai/shared";
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
  Clock3,
  GitBranch,
  ShieldAlert,
  Sparkles,
  XCircle
} from "lucide-react";
import type { ReactNode } from "react";
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
  statusBusy
}: {
  incident?: IncidentDetail;
  role: RoleMode;
  onStatus: (id: string, status: IncidentStatus) => void;
  statusBusy?: boolean;
}) {
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

  return (
    <section className="ops-panel incident-detail incident-detail--analysis">
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

      <IncidentActions incident={incident} disabled={statusBusy} onStatus={onStatus} />

      <div className="incident-analysis-tabs" aria-label="Разделы анализа">
        {["Сводка", "Timeline", "Метрики", "Логи", "Подтверждающие данные", "Действия"].map((item) => (
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

      <div className="timeline-section" id="incident-timeline">
        <h3>Timeline</h3>
        {[...incident.deploys, ...incident.metrics, ...incident.logs]
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
          .map((event) => (
            <div key={event.id} className="timeline-event">
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
            <div key={metric.id} className="timeline-row metric-row">
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
            {incident.logs.map((log) => (
              <pre key={log.id}><code>[{formatClock(log.timestamp)}] {log.level.toUpperCase()} {log.message}</code></pre>
            ))}
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
            <article key={item.id} className="evidence-card">
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
}
