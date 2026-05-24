import type { IncidentStatus } from "@triage-ai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Info, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { IncidentLogsTable } from "@/features/incidents/incident-logs-table";
import { buildTrendPoint, useIncidentWorkspace } from "@/features/incidents/incident-workspace";
import { api } from "@/lib/api";

export function IncidentsPage() {
  const queryClient = useQueryClient();
  const workspace = useIncidentWorkspace();
  const [filters, setFilters] = useState(() => createDefaultIncidentFilters());
  const [statusMessage, setStatusMessage] = useState("");

  const incidentsQuery = useQuery({ queryKey: ["incidents"], queryFn: api.incidents });
  const incidents = incidentsQuery.data ?? [];

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => matchesIncidentFilters(incident, filters));
  }, [filters, incidents]);

  useEffect(() => {
    const firstIncident = incidents[0];
    if (!workspace.selectedIncidentId && firstIncident) {
      workspace.setSelectedIncidentId(firstIncident.id);
    }
  }, [incidents, workspace]);

  const selectedIncidentId = filteredIncidents.some((incident) => incident.id === workspace.selectedIncidentId)
    ? workspace.selectedIncidentId
    : filteredIncidents[0]?.id ?? incidents[0]?.id ?? null;
  const selectedIncidentQuery = useQuery({
    queryKey: ["incident", selectedIncidentId],
    queryFn: () => api.incident(selectedIncidentId!),
    enabled: Boolean(selectedIncidentId)
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncidentStatus }) => api.updateIncidentStatus(id, status),
    onSuccess: (incident) => {
      queryClient.setQueryData(["incident", incident.id], incident);
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      workspace.appendTrend(incidents.map((item) => item.id === incident.id ? incident : item));
      setStatusMessage(`Инцидент: ${actionLabel(incident.status)}`);
    }
  });

  const metrics = useMemo(() => ({
    active: incidents.filter((incident) => incident.status !== "resolved").length,
    critical: incidents.filter((incident) => incident.severity === "critical" && incident.status !== "resolved").length,
    analyzed: incidents.filter((incident) => Boolean(incident.confidence)).length,
    lowConfidence: incidents.filter((incident) => incident.confidence === "low").length
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

  return (
    <div className="incidents-page">
      <section className="dashboard-toolbar">
        <div className="role-switch-inline" aria-label="Переключить роль">
          <button type="button" className={workspace.role === "on-call" ? "active" : ""} onClick={() => workspace.setRole("on-call")}>Дежурный инженер</button>
          <button type="button" className={workspace.role === "escalation" ? "active" : ""} onClick={() => workspace.setRole("escalation")}>Эскалация</button>
        </div>
      </section>

      {statusMessage ? (
        <div className="inline-status" role="status" aria-live="polite">
          <Info size={16} aria-hidden="true" />
          {statusMessage}
        </div>
      ) : null}

      <section className="metrics-strip incidents-metrics">
        <MetricCard label="Активные" value={metrics.active} caption="ожидают действия" icon={<Info size={18} />} />
        <MetricCard label="Критичные" value={metrics.critical} caption="не закрыты" icon={<AlertTriangle size={18} />} />
        <MetricCard label="Проанализировано ИИ" value={metrics.analyzed} caption="есть сводка" icon={<Sparkles size={18} />} />
        <MetricCard label="Низкая уверенность" value={metrics.lowConfidence} caption="нужна проверка" icon={<ShieldAlert size={18} />} />
      </section>

      <IncidentFilters
        filters={filters}
        onChange={setFilters}
        services={services}
        resultCount={filteredIncidents.length}
      />

      <div className="incidents-layout">
        <IncidentTrendChart data={trendData} />

        <section className="ops-panel incident-queue incidents-list-panel">
          <div className="panel-heading">
            <div>
              <h2>Инциденты</h2>
              <p>Выберите инцидент, чтобы увидеть детали, timeline, логи и метрики.</p>
            </div>
          </div>
          <div className="incident-list">
            {filteredIncidents.map((incident) => (
              <IncidentSummaryCard
                key={incident.id}
                incident={incident}
                active={selectedIncidentId === incident.id}
                onSelect={() => workspace.setSelectedIncidentId(incident.id)}
                onStatus={onStatus}
                statusBusy={statusMutation.isPending}
              />
            ))}
            {!filteredIncidents.length ? (
              <EmptyState
                title={incidents.length ? "Ничего не найдено" : "Инцидентов пока нет"}
                description={incidents.length ? "Измените запрос или фильтры и попробуйте снова." : "Запустите демонстрационный сценарий на панели управления, чтобы увидеть динамику, график и детали разбора."}
              >
                <Button asChild>
                  <Link to="/dashboard">Перейти на панель управления</Link>
                </Button>
              </EmptyState>
            ) : null}
          </div>
        </section>

        <IncidentDetailSections
          incident={selectedIncidentQuery.data}
          role={workspace.role}
          onStatus={onStatus}
          statusBusy={statusMutation.isPending || selectedIncidentQuery.isFetching}
        />

        <IncidentLogsTable incident={selectedIncidentQuery.data} logs={filteredLogs} />
      </div>
    </div>
  );
}
