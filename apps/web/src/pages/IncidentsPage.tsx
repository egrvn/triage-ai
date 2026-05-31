import type { FeedbackRequest, IncidentListItem, IncidentStatus } from "@triage-ai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Info, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  IncidentDetailSections,
  IncidentSummaryCard,
  IncidentTrendChart,
  MetricCard,
  actionLabel
} from "@/features/incidents/components";
import {
  IncidentFilters,
  createDefaultIncidentFilters,
  matchesIncidentFilters,
  matchesLogFilters
} from "@/features/incidents/incident-filters";
import { buildTrendPoint, useIncidentWorkspace } from "@/features/incidents/incident-workspace";
import { api } from "@/lib/api";
import { formatClock } from "@/lib/labels";

const QUEUE_MODE_KEY = "triage-ai-incident-queue-mode";

export function IncidentsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id: routeIncidentId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const workspace = useIncidentWorkspace();
  const [queueMode, setQueueMode] = useState<"on-call" | "escalation">(() => {
    if (searchParams.get("mode") === "escalation") return "escalation";
    if (searchParams.get("mode") === "on-call") return "on-call";
    return window.localStorage.getItem(QUEUE_MODE_KEY) === "escalation" ? "escalation" : "on-call";
  });
  const [filters, setFilters] = useState(() => createDefaultIncidentFilters());
  const [statusMessage, setStatusMessage] = useState("");

  const incidentsQuery = useQuery({ queryKey: ["incidents"], queryFn: api.incidents });
  const incidents = incidentsQuery.data ?? [];

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "escalation" && queueMode !== "escalation") {
      setFilters(createDefaultIncidentFilters());
      setQueueMode("escalation");
    }
    if (mode === "on-call" && queueMode !== "on-call") {
      setFilters(createDefaultIncidentFilters());
      setQueueMode("on-call");
    }
  }, [queueMode, searchParams]);

  useEffect(() => {
    window.localStorage.setItem(QUEUE_MODE_KEY, queueMode);
  }, [queueMode]);

  useEffect(() => {
    if (routeIncidentId) return;

    const desiredMode = queueMode === "escalation" ? "escalation" : "on-call";
    if (searchParams.get("mode") !== desiredMode) {
      navigate(`/incidents?mode=${desiredMode}`, { replace: true });
    }
  }, [navigate, queueMode, routeIncidentId, searchParams]);

  const modeIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (queueMode === "on-call") {
        return incident.status === "new" || incident.status === "in_progress";
      }
      return incident.status === "escalated";
    });
  }, [incidents, queueMode]);

  const filteredIncidents = useMemo(() => {
    return modeIncidents.filter((incident) => matchesIncidentFilters(incident, filters));
  }, [filters, modeIncidents]);

  useEffect(() => {
    if (routeIncidentId) {
      workspace.setSelectedIncidentId(routeIncidentId);
      return;
    }
    const firstIncident = filteredIncidents[0] ?? null;
    if (firstIncident && !filteredIncidents.some((incident) => incident.id === workspace.selectedIncidentId)) {
      workspace.setSelectedIncidentId(firstIncident.id);
      return;
    }
    if (!firstIncident && workspace.selectedIncidentId) {
      workspace.setSelectedIncidentId(null);
    }
  }, [filteredIncidents, routeIncidentId, workspace]);

  const selectedIncidentId = routeIncidentId
    ?? (filteredIncidents.some((incident) => incident.id === workspace.selectedIncidentId) ? workspace.selectedIncidentId : null)
    ?? filteredIncidents[0]?.id
    ?? null;
  const selectedIncidentQuery = useQuery({
    queryKey: ["incident", selectedIncidentId],
    queryFn: () => api.incident(selectedIncidentId!),
    enabled: Boolean(selectedIncidentId)
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
      void queryClient.invalidateQueries({ queryKey: ["incident-escalations", incident.id] });
      workspace.appendTrend(incidents.map((item) => item.id === incident.id ? incident : item));
      if (incident.status === "escalated") {
        setFilters(createDefaultIncidentFilters());
        setQueueMode("escalation");
        workspace.setSelectedIncidentId(incident.id);
        setStatusMessage("Инцидент отправлен на эскалацию");
        return;
      }
      if (incident.status === "in_progress") {
        setFilters(createDefaultIncidentFilters());
        setQueueMode("on-call");
        workspace.setSelectedIncidentId(incident.id);
        setStatusMessage("Инцидент принят в работу");
        return;
      }
      setStatusMessage(`Инцидент: ${actionLabel(incident.status)}`);
    },
    onError: () => {
      setStatusMessage("Не удалось изменить статус инцидента. Проверьте API и перезапустите dev-server.");
    }
  });

  const runScenarioMutation = useMutation({
    mutationFn: () => api.runScenario("release-regression-5xx"),
    onSuccess: (response) => {
      queryClient.setQueryData(["incident", response.incident.id], response.incident);
      queryClient.setQueryData<IncidentListItem[]>(["incidents"], (current = []) => [
        { ...response.incident },
        ...current.filter((incident) => incident.id !== response.incident.id)
      ]);
      setFilters(createDefaultIncidentFilters());
      setQueueMode("on-call");
      workspace.setSelectedIncidentId(response.incident.id);
      workspace.appendTrend([response.incident, ...incidents.filter((incident) => incident.id !== response.incident.id)]);
      setStatusMessage("Демонстрационный сценарий выполнен: инцидент создан и добавлен в очередь");
      navigate(`/incidents/${response.incident.id}`);
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: () => {
      setStatusMessage("Не удалось запустить сценарий. Проверьте API.");
    }
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FeedbackRequest }) => api.sendFeedback(id, payload),
    onSuccess: (_response, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["incident", variables.id] });
      setStatusMessage(variables.payload.hypothesisVerdict === "partially_correct"
        ? "Отмечено: требуется дополнительная проверка"
        : "Feedback сохранён: гипотеза отмечена как неверная");
    },
    onError: () => setStatusMessage("Не удалось сохранить feedback.")
  });

  const metrics = useMemo(() => ({
    new: incidents.filter((incident) => incident.status === "new").length,
    inProgress: incidents.filter((incident) => incident.status === "in_progress").length,
    escalated: incidents.filter((incident) => incident.status === "escalated").length,
    closed: incidents.filter((incident) => incident.status === "closed").length
  }), [incidents]);

  const trendData = workspace.trend.length ? workspace.trend : incidents.length ? [buildTrendPoint(incidents, "сейчас")] : [];

  const services = useMemo(() => {
    const values = new Set<string>();
    incidents.forEach((incident) => values.add(incident.serviceName));
    selectedIncidentQuery.data?.logs.forEach((log) => values.add(log.serviceName));
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [incidents, selectedIncidentQuery.data]);

  const filteredLogs = useMemo(() => {
    return (selectedIncidentQuery.data?.logs ?? []).filter((log) => matchesLogFilters(log, filters));
  }, [filters, selectedIncidentQuery.data]);

  const onStatus = (id: string, status: IncidentStatus) => {
    statusMutation.mutate({ id, status });
  };
  const switchRole = (role: typeof queueMode) => {
    setFilters(createDefaultIncidentFilters());
    setQueueMode(role);
  };

  if (routeIncidentId) {
    return (
      <div className="incidents-page incident-workspace-page">
        {statusMessage ? (
          <div className="inline-status" role="status" aria-live="polite">
            <Info size={16} aria-hidden="true" />
            {statusMessage}
          </div>
        ) : null}

        <IncidentDetailSections
          incident={selectedIncidentQuery.data}
          role={workspace.role}
          logs={filteredLogs}
          onStatus={onStatus}
          onFeedbackWrong={(id) => feedbackMutation.mutate({ id, payload: { usefulness: "not_useful", hypothesisVerdict: "incorrect" } })}
          onFeedbackPartial={(id) => feedbackMutation.mutate({ id, payload: { usefulness: "useful", hypothesisVerdict: "partially_correct" } })}
          statusBusy={statusMutation.isPending || selectedIncidentQuery.isFetching || feedbackMutation.isPending}
          workspaceMode
        />
      </div>
    );
  }

  return (
    <div className="incidents-page">
      <section className="dashboard-toolbar">
        <div className="role-mode-control" aria-label="Режим работы">
          <span className="eyebrow">Очередь</span>
          <div className="role-switch-inline">
            <button type="button" className={queueMode === "on-call" ? "active" : ""} onClick={() => switchRole("on-call")}>Дежурный инженер</button>
            <button type="button" className={queueMode === "escalation" ? "active" : ""} onClick={() => switchRole("escalation")}>Эскалация</button>
          </div>
          <p>{queueMode === "on-call"
            ? "Дежурный инженер — первичный разбор, принятие в работу и решение по mitigation."
            : "Эскалация — очередь инцидентов, переданных другой команде с полным контекстом, timeline и evidence."}</p>
        </div>
      </section>

      {statusMessage ? (
        <div className="inline-status" role="status" aria-live="polite">
          <Info size={16} aria-hidden="true" />
          {statusMessage}
        </div>
      ) : null}

      <section className="metrics-strip incidents-metrics">
        <MetricCard label="Новые" value={metrics.new} caption="ожидают triage" icon={<Info size={18} />} />
        <MetricCard label="В работе" value={metrics.inProgress} caption="приняты инженером" icon={<Sparkles size={18} />} />
        <MetricCard label="Эскалация" value={metrics.escalated} caption="handoff команде" icon={<AlertTriangle size={18} />} />
        <MetricCard label="Закрытые" value={metrics.closed} caption="есть история" icon={<ShieldAlert size={18} />} />
      </section>

      <div className="incidents-layout">
        <section className="ops-panel incident-queue incidents-list-panel">
          <div className="panel-heading">
            <div>
              <h2>{queueMode === "on-call" ? "Очередь дежурного инженера" : "Очередь эскалации"}</h2>
              <p>{queueMode === "on-call"
                ? "Новые инциденты и инциденты в работе. Возьмите сигнал в работу, закройте или передайте на эскалацию."
                : "Только инциденты, переданные другой команде с handoff summary, timeline и evidence."}</p>
            </div>
          </div>
          <div className="incident-list">
            {filteredIncidents.map((incident) => (
              <IncidentSummaryCard
                key={incident.id}
                incident={incident}
                active={selectedIncidentId === incident.id}
                onSelect={() => {
                  workspace.setSelectedIncidentId(incident.id);
                  navigate(`/incidents/${incident.id}`);
                }}
                onStatus={onStatus}
                statusBusy={statusMutation.isPending}
              />
            ))}
            {!filteredIncidents.length ? (
              <EmptyState
                title={queueMode === "on-call" ? "Активных инцидентов нет" : "Инцидентов на эскалации пока нет"}
                description={queueMode === "on-call"
                  ? "Активных инцидентов для дежурного инженера нет. Запустите демонстрационный сценарий или проверьте очередь эскалации."
                  : "Нажмите «Эскалировать» в карточке инцидента, чтобы зафиксировать handoff-событие."}
              >
                {queueMode === "on-call" ? (
                  <Button type="button" disabled={runScenarioMutation.isPending} onClick={() => runScenarioMutation.mutate()}>
                    {runScenarioMutation.isPending ? "Запускаем..." : "Запустить сценарий"}
                  </Button>
                ) : null}
              </EmptyState>
            ) : null}
          </div>
        </section>

        <section className="ops-panel incident-log-overview">
          <div className="panel-heading">
            <div>
              <h2>Логи выбранного инцидента</h2>
              <p>Короткий срез по фильтрам. Полный разбор находится в рабочей области.</p>
            </div>
            {selectedIncidentId ? (
              <Button asChild variant="outline" size="sm">
                <Link to={`/incidents/${selectedIncidentId}`}>Открыть</Link>
              </Button>
            ) : null}
          </div>
          <div className="log-list overview">
            {filteredLogs.slice(0, 6).map((log) => (
              <pre key={log.id} id={`log-${log.id}`}><code>[{formatClock(log.timestamp)}] {log.level.toUpperCase()} {log.serviceName}: {log.message}</code></pre>
            ))}
            {!filteredLogs.length ? <p className="muted-copy">По выбранным фильтрам логи не найдены.</p> : null}
          </div>
        </section>
      </div>

      <IncidentFilters
        filters={filters}
        services={services}
        resultCount={filteredIncidents.length}
        onChange={setFilters}
      />

      <IncidentTrendChart data={trendData} />
    </div>
  );
}
