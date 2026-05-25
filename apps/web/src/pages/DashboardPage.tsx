import type { IncidentListItem, IncidentStatus, ScenarioSummary } from "@triage-ai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, AlertTriangle, ArrowRight, Info, Play, RefreshCcw, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ConfidenceBadge, SeverityBadge, StatusBadge, StatusPill } from "@/components/StatusPill";
import { AnimatedGlowingSearchBar } from "@/components/ui/animated-glowing-search-bar";
import { Button } from "@/components/ui/button";
import {
  IncidentActions,
  IncidentTrendChart,
  MetricCard,
  includesQuery,
  actionLabel
} from "@/features/incidents/components";
import { buildTrendPoint, guideSteps, roleCopy, useIncidentWorkspace } from "@/features/incidents/incident-workspace";
import { api } from "@/lib/api";
import { formatClock } from "@/lib/labels";
import { pilotMetrics } from "@/lib/pilot-metrics";

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
      <button
        className="scenario-card__body"
        type="button"
        disabled={running}
        onClick={() => {
          onSelect();
          onRun();
        }}
        aria-label={`Запустить и открыть инцидент: ${scenario.name}`}
      >
        <span className="scenario-card__kicker">{scenario.incidentType}</span>
        <strong>{scenario.name}</strong>
        <p>{scenario.description}</p>
        <div className="scenario-card__meta">
          <span>{scenario.serviceName}</span>
          {scenario.recommended ? <StatusPill tone="healthy">рекомендуется</StatusPill> : null}
        </div>
      </button>
      <Button
        type="button"
        size="icon"
        className="scenario-card__play"
        disabled={running}
        onClick={onRun}
        aria-label={`Запустить сценарий ${scenario.name}`}
      >
        {running ? <RefreshCcw size={16} className="spin" aria-hidden="true" /> : <Play size={16} fill="currentColor" aria-hidden="true" />}
      </Button>
    </article>
  );
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const workspace = useIncidentWorkspace();
  const [search, setSearch] = useState("");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

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
    if (!workspace.selectedIncidentId && firstIncident) {
      workspace.setSelectedIncidentId(firstIncident.id);
    }
  }, [incidents, workspace]);

  const selectedIncident = incidents.find((incident) => incident.id === workspace.selectedIncidentId) ?? incidents[0];
  const trendData = workspace.trend.length ? workspace.trend : incidents.length ? [buildTrendPoint(incidents, "сейчас")] : [];

  const runScenarioMutation = useMutation({
    mutationFn: async (scenarioId: string) => {
      setRunningScenarioId(scenarioId);
      await delay(650);
      return api.runScenario(scenarioId);
    },
    onSuccess: (response) => {
      queryClient.setQueryData(["incident", response.incident.id], response.incident);
      queryClient.setQueryData<IncidentListItem[]>(["incidents"], (current = []) => [
        { ...response.incident },
        ...current.filter((incident) => incident.id !== response.incident.id)
      ]);
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      workspace.setSelectedIncidentId(response.incident.id);
      workspace.setRole("on-call");
      const nextIncidents = [response.incident, ...incidents.filter((incident) => incident.id !== response.incident.id)];
      workspace.appendTrend(nextIncidents);
      setStatusMessage("Демонстрационный сценарий выполнен: инцидент создан и проанализирован");
      navigate(`/incidents/${response.incident.id}`);
    },
    onError: () => setStatusMessage("Не удалось запустить сценарий. Проверьте API."),
    onSettled: () => setRunningScenarioId(null)
  });

  const resetMutation = useMutation({
    mutationFn: api.resetDemo,
    onSuccess: (response) => {
      workspace.setSelectedIncidentId(null);
      workspace.resetTrend();
      setSelectedScenarioId(null);
      setStatusMessage(response.incidentsCleared > 0 ? "Данные обновлены, инциденты очищены" : "Данные обновлены");
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: () => setStatusMessage("Не удалось обновить данные.")
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: IncidentStatus }) => {
      if (status === "escalated") {
        const response = await api.createEscalation(id);
        return response.incident;
      }
      return api.updateIncidentStatus(id, status);
    },
    onSuccess: (incident) => {
      queryClient.setQueryData(["incident", incident.id], incident);
      queryClient.setQueryData<IncidentListItem[]>(["incidents"], (current) => {
        const source = current?.length ? current : incidents;
        const nextItem: IncidentListItem = { ...incident };
        return source.some((item) => item.id === incident.id)
          ? source.map((item) => item.id === incident.id ? { ...item, ...nextItem } : item)
          : [nextItem, ...source];
      });
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      workspace.appendTrend(incidents.map((item) => item.id === incident.id ? incident : item));
      if (incident.status === "escalated") {
        workspace.setRole("escalation");
        workspace.setSelectedIncidentId(incident.id);
        setStatusMessage("Инцидент отправлен на эскалацию");
        return;
      }
      setStatusMessage(`Инцидент: ${actionLabel(incident.status)}`);
    }
  });

  const metrics = useMemo(() => ({
    criticalActive: incidents.filter((incident) => incident.severity === "critical" && incident.status !== "closed").length,
    analyzed: incidents.filter((incident) => Boolean(incident.confidence)).length,
    lowConfidence: incidents.filter((incident) => incident.confidence === "low").length
  }), [incidents]);

  const submitSearch = (value: string) => {
    const query = value.trim().toLowerCase();
    if (!query) return;
    const incident = filteredIncidents[0];
    if (incident) {
      workspace.setSelectedIncidentId(incident.id);
      setStatusMessage("Найденный инцидент выбран");
      return;
    }
    const scenario = filteredScenarios[0];
    if (scenario) {
      setSelectedScenarioId(scenario.id);
      setStatusMessage("Найденный сценарий выбран");
      return;
    }
    setStatusMessage("Ничего не найдено. Измените запрос или фильтры.");
  };

  const onStatus = (id: string, status: IncidentStatus) => {
    statusMutation.mutate({ id, status });
  };

  return (
    <div className="dashboard-page dashboard-page--overview">
      <section className="dashboard-toolbar">
        <AnimatedGlowingSearchBar
          value={search}
          onChange={setSearch}
          onSubmit={submitSearch}
          placeholder="Искать инцидент или сервис..."
        />
        <div className="role-mode-control" aria-label="Режим работы">
          <div className="role-switch-inline">
            <button type="button" className={workspace.role === "on-call" ? "active" : ""} onClick={() => workspace.setRole("on-call")}>Дежурный инженер</button>
            <button type="button" className={workspace.role === "escalation" ? "active" : ""} onClick={() => workspace.setRole("escalation")}>Эскалация</button>
          </div>
          <p>{workspace.role === "on-call"
            ? "Фокус на impact и ближайшем безопасном действии."
            : "Фокус на evidence и передаче контекста команде."}</p>
        </div>
        <Button type="button" variant="outline" disabled={resetMutation.isPending} onClick={() => resetMutation.mutate()}>
          <RefreshCcw size={16} className={resetMutation.isPending ? "spin" : ""} aria-hidden="true" />
          Обновить
        </Button>
      </section>

      {statusMessage ? (
        <div className="inline-status" role="status" aria-live="polite">
          <Info size={16} aria-hidden="true" />
          {statusMessage}
        </div>
      ) : null}

      <section className={`onboarding-card ${workspace.guideOpen ? "" : "collapsed"}`}>
        <div className="panel-heading compact">
          <div>
            <h2>Как пользоваться Triage AI</h2>
            <p>Синтетические данные позволяют безопасно проверить полный цикл разбора без production secrets.</p>
          </div>
          <Button type="button" variant="ghost" onClick={() => workspace.setGuideOpen(!workspace.guideOpen)}>
            {workspace.guideOpen ? "Скрыть инструкцию" : "Показать инструкцию"}
          </Button>
        </div>
        {workspace.guideOpen ? (
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
              Уверенность показывает надёжность гипотезы причины. Низкая уверенность означает, что сигнал неполный:
              проверьте подтверждающие данные вручную или отправьте инцидент на эскалацию.
            </p>
          </>
        ) : null}
      </section>

      <section className="metrics-strip">
        <MetricCard label="Активные критичные" value={metrics.criticalActive} caption="не закрыты" icon={<AlertTriangle size={18} />} />
        <MetricCard label="Проанализировано ИИ" value={metrics.analyzed} caption="есть сводка и гипотеза" icon={<Sparkles size={18} />} />
        <MetricCard label="Низкая уверенность" value={metrics.lowConfidence} caption="нужна ручная проверка" icon={<ShieldAlert size={18} />} />
      </section>

      <div className="dashboard-overview-grid">
        <section className="ops-panel scenario-panel">
          <div className="panel-heading">
            <div>
              <h2>Демонстрационные сценарии</h2>
              <p>Запустите синтетические сценарии Prometheus/ELK и посмотрите полный цикл разбора.</p>
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

        <aside className="dashboard-insight-column">
          <section className="ops-panel last-incident-card">
            <div className="panel-heading compact">
              <div>
                <h2>Последний инцидент</h2>
                <p>Краткий статус и переход к полному анализу.</p>
              </div>
            </div>
            {selectedIncident ? (
              <div className="last-incident-card__body">
                <div>
                  <strong>{selectedIncident.title}</strong>
                  <p>{selectedIncident.serviceName} · {formatClock(selectedIncident.detectedAt)}</p>
                </div>
                <div className="incident-row__badges">
                  <SeverityBadge severity={selectedIncident.severity} />
                  <StatusBadge status={selectedIncident.status} />
                  {selectedIncident.confidence ? <ConfidenceBadge confidence={selectedIncident.confidence} /> : null}
                </div>
                <IncidentActions incident={selectedIncident} disabled={statusMutation.isPending} onStatus={onStatus} />
                <Button asChild>
                  <Link to={`/incidents/${selectedIncident.id}`}>
                    Открыть анализ инцидентов
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                title="Нет активных инцидентов"
                description="Запустите демонстрационный сценарий, чтобы увидеть сводку и перейти к анализу."
              />
            )}
          </section>
          <section className="ops-panel pilot-kpi-card">
            <div>
              <span className="eyebrow">Гипотезы пилота, не доказанный эффект</span>
              <h2>Что измеряем на пилоте</h2>
              <p>Эти показатели проверяют, сокращает ли Triage AI путь от alert до рабочей гипотезы.</p>
            </div>
            <div className="pilot-kpi-list">
              {pilotMetrics.map((metric) => (
                <article key={metric.label}>
                  <strong>{metric.label}</strong>
                  <span>{metric.value}</span>
                  <p>{metric.caption}</p>
                </article>
              ))}
            </div>
          </section>
          <IncidentTrendChart data={trendData} compact />
        </aside>

        <section className="ops-panel incident-queue">
          <div className="panel-heading">
            <div>
              <h2>Очередь инцидентов</h2>
              <p>Общий контекст для дежурного инженера и эскалации.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/incidents">Все инциденты</Link>
            </Button>
          </div>
          <div className="incident-list compact">
            {filteredIncidents.slice(0, 4).map((incident) => (
              <article key={incident.id} className={`incident-row ${workspace.selectedIncidentId === incident.id ? "active" : ""}`}>
                <button type="button" className="incident-row__main" onClick={() => workspace.setSelectedIncidentId(incident.id)}>
                  <span>
                    <strong>{incident.title}</strong>
                    <small>{incident.serviceName} · {formatClock(incident.detectedAt)}</small>
                  </span>
                  <span className="incident-row__badges">
                    <SeverityBadge severity={incident.severity} />
                    <StatusBadge status={incident.status} />
                  </span>
                </button>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/incidents/${incident.id}`}>Открыть</Link>
                </Button>
              </article>
            ))}
            {!filteredIncidents.length ? (
              <EmptyState
                title={incidents.length ? "Ничего не найдено" : "Нет активных инцидентов"}
                description={incidents.length ? "Измените запрос или фильтры и попробуйте снова." : "Запустите демонстрационный сценарий, чтобы увидеть сводку, гипотезу причины и подтверждающие данные."}
              />
            ) : null}
          </div>
        </section>

        <section className="ops-panel role-summary-card">
          <Activity size={20} aria-hidden="true" />
          <div>
            <span className="eyebrow">{roleCopy[workspace.role].title}</span>
            <h2>Рекомендации меняются по роли</h2>
            <p>{roleCopy[workspace.role].hint}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
