import type { IncidentDetail, IncidentListItem, IncidentStatus, ScenarioSummary } from "@coursework/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  GitBranch,
  Info,
  Play,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import { AnimatedGlowingSearchBar } from "@/components/ui/animated-glowing-search-bar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { confidenceLabel, formatClock, statusLabel } from "@/lib/labels";

const ROLE_KEY = "triage-ai-role";
const GUIDE_KEY = "triage-ai-guide-visible";

type RoleMode = "on-call" | "escalation";

const roleCopy: Record<RoleMode, { title: string; hint: string; actions: string[] }> = {
  "on-call": {
    title: "On-call view",
    hint: "Сфокусируйтесь на impact, affected service и ближайшем безопасном действии.",
    actions: ["Проверить service health", "Сравнить error rate до/после Deployment", "Подготовить rollback plan", "Создать escalation при росте impact"]
  },
  escalation: {
    title: "Escalation view",
    hint: "Проверьте timeline, evidence и confidence перед передачей контекста команде.",
    actions: ["Проверить evidence coverage", "Сверить timeline и deploy correlation", "Оценить confidence", "Передать context владельцу service"]
  }
};

const guideSteps = [
  ["Выберите demo сценарий", "Сценарий имитирует поток Signals из Prometheus/ELK и создаёт incident для анализа."],
  ["Запустите triage", "Нажмите play, чтобы система собрала context, сформировала auto-summary и root-cause hypothesis."],
  ["Проверьте evidence", "Откройте incident details и проверьте Logs, Metrics, timeline и deploy correlation."],
  ["Выберите действие", "On-call может принять incident в работу, закрыть его или отправить в escalation."],
  ["Проверьте интеграции", "В разделе Интеграции показано, какие источники работают в mock mode, а какие требуют production настройки."]
];

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function includesQuery(value: string | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query);
}

function actionLabel(status: IncidentStatus) {
  if (status === "acknowledged") return "Принят в работу";
  if (status === "escalated") return "Escalated";
  if (status === "resolved") return "Закрыт";
  return "Активен";
}

function MetricCard({ label, value, caption, icon }: { label: string; value: number; caption: string; icon: ReactNode }) {
  return (
    <article className="metric-card">
      <div className="metric-card__icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{caption}</small>
      </div>
    </article>
  );
}

function IncidentActions({
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
        <ClipboardCheck size={15} />
        Принять в работу
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || incident.status === "escalated" || incident.status === "resolved"}
        onClick={() => onStatus(incident.id, "escalated")}
      >
        <ArrowUpRight size={15} />
        Эскалировать
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled || incident.status === "resolved"}
        onClick={() => onStatus(incident.id, "resolved")}
      >
        <XCircle size={15} />
        Закрыть
      </Button>
    </div>
  );
}

function ScenarioCard({
  scenario,
  active,
  running,
  onSelect,
  onRun
}: {
  scenario: ScenarioSummary;
  active: boolean;
  running: boolean;
  onSelect: () => void;
  onRun: () => void;
}) {
  return (
    <article className={`scenario-card ${active ? "active" : ""}`}>
      <button className="scenario-card__body" type="button" onClick={onSelect} aria-label={`Выбрать scenario ${scenario.name}`}>
        <span className="scenario-card__kicker">{scenario.incidentType}</span>
        <strong>{scenario.name}</strong>
        <p>{scenario.description}</p>
        <div className="scenario-card__meta">
          <span>{scenario.serviceName}</span>
          {scenario.recommended ? <StatusPill tone="healthy">recommended</StatusPill> : null}
        </div>
      </button>
      <Button
        type="button"
        size="icon"
        className="scenario-card__play"
        disabled={running}
        onClick={onRun}
        aria-label={`Запустить scenario ${scenario.name}`}
      >
        {running ? <RefreshCcw size={16} className="spin" /> : <Play size={16} fill="currentColor" />}
      </Button>
    </article>
  );
}

function IncidentDetailPanel({
  incident,
  isLoading,
  role,
  onStatus,
  statusBusy
}: {
  incident?: IncidentDetail;
  isLoading: boolean;
  role: RoleMode;
  onStatus: (id: string, status: IncidentStatus) => void;
  statusBusy: boolean;
}) {
  if (isLoading) {
    return (
      <section className="ops-panel incident-detail skeleton-panel">
        <RefreshCcw className="spin" size={20} />
        <p>Загружаем incident details...</p>
      </section>
    );
  }

  if (!incident) {
    return (
      <section className="ops-panel incident-detail">
        <EmptyState
          title="Нет активных инцидентов"
          description="Запустите demo сценарий, чтобы увидеть AI-сводку, hypothesis и evidence."
        />
      </section>
    );
  }

  const analysis = incident.analysis;
  const copy = roleCopy[role];
  const latestDeploy = incident.deploys[0];

  return (
    <section className="ops-panel incident-detail">
      <div className="incident-header">
        <div>
          <span className="eyebrow">Incident details</span>
          <h2>{incident.title}</h2>
          <p>{incident.serviceName} · обнаружен {formatClock(incident.detectedAt)}</p>
        </div>
        <div className="incident-header__badges">
          <StatusPill tone={incident.severity}>{incident.severity}</StatusPill>
          <StatusPill tone={incident.status}>{statusLabel(incident.status)}</StatusPill>
          {incident.confidence ? <StatusPill tone={incident.confidence}>{confidenceLabel(incident.confidence)}</StatusPill> : null}
        </div>
      </div>

      <IncidentActions incident={incident} disabled={statusBusy} onStatus={onStatus} />

      <div className="analysis-grid">
        <article className="analysis-card primary">
          <Sparkles size={18} />
          <h3>AI summary</h3>
          <p>{analysis?.summary ?? incident.summary ?? "AI summary пока не сформирована."}</p>
        </article>
        <article className="analysis-card">
          <ShieldAlert size={18} />
          <h3>Root-cause hypothesis</h3>
          <p>{analysis?.hypothesis ?? incident.hypothesis ?? "Недостаточно context для hypothesis."}</p>
        </article>
        <article className="analysis-card">
          <GitBranch size={18} />
          <h3>Deploy correlation</h3>
          {latestDeploy ? (
            <p>
              Последний Deployment: {latestDeploy.version} · {latestDeploy.branch} · {formatClock(latestDeploy.timestamp)}
            </p>
          ) : (
            <p>Deployment context отсутствует. Проверьте Logs и Metrics вручную.</p>
          )}
        </article>
      </div>

      <div className="role-guidance">
        <div>
          <span className="eyebrow">{copy.title}</span>
          <p>{copy.hint}</p>
        </div>
        <ul>
          {(analysis?.nextStep ? [analysis.nextStep, ...copy.actions] : copy.actions).slice(0, 4).map((action) => (
            <li key={action}>
              <CheckCircle2 size={15} />
              {action}
            </li>
          ))}
        </ul>
      </div>

      <div className="evidence-section">
        <div className="section-heading compact">
          <h3>Evidence</h3>
          <p>Explainability: Metrics, Logs и Deployment context, которые поддерживают hypothesis.</p>
        </div>
        <div className="evidence-list">
          {(analysis?.evidence ?? []).map((item) => (
            <article key={item.id} className="evidence-card">
              <StatusPill tone={item.kind === "deploy" ? "adapter" : item.kind === "metric" ? "healthy" : "mock"}>{item.kind}</StatusPill>
              <strong>{item.title}</strong>
              <p>{item.quote}</p>
              <small>weight {Math.round(item.weight * 100)}%</small>
            </article>
          ))}
          {!analysis?.evidence?.length ? (
            <p className="muted-copy">Evidence появится после запуска demo scenario или ручного анализа.</p>
          ) : null}
        </div>
      </div>

      <div className="timeline-grid">
        <article>
          <h3>Metrics</h3>
          {incident.metrics.map((metric) => (
            <div key={metric.id} className="timeline-row">
              <Clock3 size={14} />
              <span>{formatClock(metric.timestamp)}</span>
              <strong>{metric.name}</strong>
              <em>{metric.value} {metric.unit}</em>
            </div>
          ))}
        </article>
        <article>
          <h3>Logs</h3>
          {incident.logs.map((log) => (
            <div key={log.id} className="timeline-row">
              <StatusPill tone={log.level === "error" ? "critical" : "warning"}>{log.level}</StatusPill>
              <strong>{log.message}</strong>
            </div>
          ))}
        </article>
      </div>
    </section>
  );
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [role, setRole] = useState<RoleMode>(() => {
    if (typeof window === "undefined") return "on-call";
    return window.localStorage.getItem(ROLE_KEY) === "escalation" ? "escalation" : "on-call";
  });
  const [guideOpen, setGuideOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(GUIDE_KEY) !== "false";
  });

  const scenariosQuery = useQuery({ queryKey: ["scenarios"], queryFn: api.scenarios });
  const incidentsQuery = useQuery({ queryKey: ["incidents"], queryFn: api.incidents });

  const incidents = incidentsQuery.data ?? [];
  const scenarios = scenariosQuery.data ?? [];
  const normalizedSearch = search.trim().toLowerCase();

  const filteredScenarios = useMemo(() => {
    if (!normalizedSearch) return scenarios;
    return scenarios.filter((scenario) => [
      scenario.name,
      scenario.description,
      scenario.serviceName,
      scenario.incidentType
    ].some((value) => includesQuery(value, normalizedSearch)));
  }, [normalizedSearch, scenarios]);

  const filteredIncidents = useMemo(() => {
    if (!normalizedSearch) return incidents;
    return incidents.filter((incident) => [
      incident.title,
      incident.serviceName,
      incident.status,
      incident.severity,
      incident.confidence
    ].some((value) => includesQuery(value, normalizedSearch)));
  }, [incidents, normalizedSearch]);

  useEffect(() => {
    const firstIncident = incidents[0];
    if (!selectedIncidentId && firstIncident) {
      setSelectedIncidentId(firstIncident.id);
    }
  }, [incidents, selectedIncidentId]);

  useEffect(() => {
    window.localStorage.setItem(ROLE_KEY, role);
  }, [role]);

  useEffect(() => {
    window.localStorage.setItem(GUIDE_KEY, String(guideOpen));
  }, [guideOpen]);

  const selectedIncidentQuery = useQuery({
    queryKey: ["incident", selectedIncidentId],
    queryFn: () => api.incident(selectedIncidentId!),
    enabled: Boolean(selectedIncidentId)
  });

  const runScenarioMutation = useMutation({
    mutationFn: async (scenarioId: string) => {
      setRunningScenarioId(scenarioId);
      await delay(650);
      return api.runScenario(scenarioId);
    },
    onSuccess: (response) => {
      queryClient.setQueryData(["incident", response.incident.id], response.incident);
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      setSelectedIncidentId(response.incident.id);
      setStatusMessage("Demo scenario выполнен: incident создан и проанализирован");
    },
    onError: () => {
      setStatusMessage("Не удалось запустить scenario. Проверьте API.");
    },
    onSettled: () => {
      setRunningScenarioId(null);
    }
  });

  const resetMutation = useMutation({
    mutationFn: api.resetDemo,
    onSuccess: (response) => {
      setSelectedIncidentId(null);
      setSelectedScenarioId(null);
      setStatusMessage(response.incidentsCleared > 0 ? "Данные обновлены, incidents очищены" : "Данные обновлены");
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: () => {
      setStatusMessage("Не удалось обновить данные.");
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncidentStatus }) => api.updateIncidentStatus(id, status),
    onSuccess: (incident) => {
      queryClient.setQueryData(["incident", incident.id], incident);
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      setStatusMessage(`Incident: ${actionLabel(incident.status)}`);
    }
  });

  const metrics = useMemo(() => ({
    criticalActive: incidents.filter((incident) => incident.severity === "critical" && incident.status !== "resolved").length,
    analyzed: incidents.filter((incident) => Boolean(incident.confidence)).length,
    lowConfidence: incidents.filter((incident) => incident.confidence === "low").length
  }), [incidents]);

  const submitSearch = (value: string) => {
    const query = value.trim().toLowerCase();
    if (!query) return;
    const incident = filteredIncidents[0];
    if (incident) {
      setSelectedIncidentId(incident.id);
      setStatusMessage("Найденный incident открыт");
      return;
    }
    const scenario = filteredScenarios[0];
    if (scenario) {
      setSelectedScenarioId(scenario.id);
      setStatusMessage("Найденный scenario выбран");
      return;
    }
    setStatusMessage("Ничего не найдено. Измените запрос или фильтры.");
  };

  const onStatus = (id: string, status: IncidentStatus) => {
    statusMutation.mutate({ id, status });
  };

  return (
    <div className="dashboard-page">
      <section className="dashboard-toolbar">
        <AnimatedGlowingSearchBar value={search} onChange={setSearch} onSubmit={submitSearch} />
        <div className="role-switch-inline" aria-label="Переключить роль">
          <button type="button" className={role === "on-call" ? "active" : ""} onClick={() => setRole("on-call")}>On-call</button>
          <button type="button" className={role === "escalation" ? "active" : ""} onClick={() => setRole("escalation")}>Escalation</button>
        </div>
        <Button type="button" variant="outline" disabled={resetMutation.isPending} onClick={() => resetMutation.mutate()}>
          <RefreshCcw size={16} className={resetMutation.isPending ? "spin" : ""} />
          Обновить
        </Button>
      </section>

      {statusMessage ? (
        <div className="inline-status" role="status">
          <Info size={16} />
          {statusMessage}
        </div>
      ) : null}

      <section className={`onboarding-card ${guideOpen ? "" : "collapsed"}`}>
        <div className="panel-heading compact">
          <div>
            <h2>Как пользоваться Triage AI</h2>
            <p>mock mode использует synthetic data: это демонстрация end-to-end triage flow без production secrets.</p>
          </div>
          <Button type="button" variant="ghost" onClick={() => setGuideOpen((value) => !value)}>
            {guideOpen ? "Скрыть инструкцию" : "Показать инструкцию"}
          </Button>
        </div>
        {guideOpen ? (
          <>
            <div className="guide-grid">
              {guideSteps.map(([title, text], index) => (
                <article key={title}>
                  <span>{index + 1}</span>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <p className="guide-note">
              Confidence показывает надежность hypothesis. Low confidence fallback означает, что signal неполный:
              проверьте evidence вручную или отправьте incident в escalation.
            </p>
          </>
        ) : null}
      </section>

      <div className="dashboard-grid">
        <section className="ops-panel scenario-panel">
          <div className="panel-heading">
            <div>
              <h2>Demo сценарии</h2>
              <p>Запустите synthetic Prometheus/ELK сценарии end-to-end.</p>
            </div>
          </div>
          <div className="scenario-list">
            {filteredScenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                active={selectedScenarioId === scenario.id}
                running={runningScenarioId === scenario.id}
                onSelect={() => setSelectedScenarioId(scenario.id)}
                onRun={() => {
                  setSelectedScenarioId(scenario.id);
                  runScenarioMutation.mutate(scenario.id);
                }}
              />
            ))}
            {!filteredScenarios.length ? (
              <EmptyState title="Ничего не найдено" description="Измените запрос или фильтры и попробуйте снова." />
            ) : null}
          </div>
        </section>

        <section className="metrics-strip">
          <MetricCard label="Критичные активные" value={metrics.criticalActive} caption="status не resolved" icon={<AlertTriangle size={18} />} />
          <MetricCard label="Проанализировано AI" value={metrics.analyzed} caption="incidents с AI summary" icon={<Sparkles size={18} />} />
          <MetricCard label="Низкая confidence" value={metrics.lowConfidence} caption="нужна ручная проверка" icon={<ShieldAlert size={18} />} />
        </section>

        <section className="ops-panel incident-queue">
          <div className="panel-heading">
            <div>
              <h2>Очередь инцидентов</h2>
              <p>Общий контекст для on-call и escalation roles.</p>
            </div>
          </div>
          <div className="incident-list">
            {filteredIncidents.map((incident) => (
              <article key={incident.id} className={`incident-row ${selectedIncidentId === incident.id ? "active" : ""}`}>
                <button type="button" className="incident-row__main" onClick={() => setSelectedIncidentId(incident.id)}>
                  <span>
                    <strong>{incident.title}</strong>
                    <small>{incident.serviceName} · {formatClock(incident.detectedAt)}</small>
                  </span>
                  <span className="incident-row__badges">
                    <StatusPill tone={incident.severity}>{incident.severity}</StatusPill>
                    <StatusPill tone={incident.status}>{statusLabel(incident.status)}</StatusPill>
                  </span>
                </button>
                <IncidentActions incident={incident} disabled={statusMutation.isPending} onStatus={onStatus} />
              </article>
            ))}
            {!filteredIncidents.length ? (
              <EmptyState
                title={incidents.length ? "Ничего не найдено" : "Нет активных инцидентов"}
                description={incidents.length ? "Измените запрос или фильтры и попробуйте снова." : "Запустите demo сценарий, чтобы увидеть AI-сводку, hypothesis и evidence."}
              />
            ) : null}
          </div>
        </section>

        <IncidentDetailPanel
          incident={selectedIncidentQuery.data}
          isLoading={selectedIncidentQuery.isFetching}
          role={role}
          onStatus={onStatus}
          statusBusy={statusMutation.isPending}
        />
      </div>
    </div>
  );
}
