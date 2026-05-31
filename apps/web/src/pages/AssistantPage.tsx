import type { IncidentListItem } from "@triage-ai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, Info, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { AssistantWorkspace } from "@/features/incidents/assistant";
import { useIncidentWorkspace } from "@/features/incidents/incident-workspace";
import { api } from "@/lib/api";

export function AssistantPage() {
  const queryClient = useQueryClient();
  const workspace = useIncidentWorkspace();
  const [manualForm, setManualForm] = useState({
    serviceName: "custom-svc",
    severity: "warning",
    message: "Пользователь сообщил о росте ошибок в custom-svc.",
    logSnippet: "WARN custom-svc request group exceeded baseline around 10:15",
    metricSnippet: "custom_error_rate=0.04",
    deployEvent: ""
  });
  const [manualStatus, setManualStatus] = useState("");
  const incidentsQuery = useQuery({ queryKey: ["incidents"], queryFn: api.incidents });
  const incidents = incidentsQuery.data ?? [];

  useEffect(() => {
    if (!workspace.selectedIncidentId && incidents[0]) {
      workspace.setSelectedIncidentId(incidents[0].id);
    }
  }, [incidents, workspace]);

  const selectedIncidentId = incidents.some((incident) => incident.id === workspace.selectedIncidentId)
    ? workspace.selectedIncidentId
    : incidents[0]?.id;

  const incidentQuery = useQuery({
    queryKey: ["incident", selectedIncidentId],
    queryFn: () => api.incident(selectedIncidentId!),
    enabled: Boolean(selectedIncidentId)
  });

  const manualMutation = useMutation({
    mutationFn: () => api.ingestCustom({
      source: "manual",
      serviceName: manualForm.serviceName,
      message: manualForm.message,
      title: manualForm.message.slice(0, 90),
      severity: manualForm.severity as "critical" | "warning" | "info",
      timestamp: new Date().toISOString(),
      labels: { createdBy: "assistant-page" },
      logSnippet: manualForm.logSnippet || undefined,
      metricSnippet: manualForm.metricSnippet || undefined,
      deployEvent: manualForm.deployEvent || undefined
    }),
    onSuccess: (response) => {
      queryClient.setQueryData(["incident", response.incident.id], response.incident);
      queryClient.setQueryData<IncidentListItem[]>(["incidents"], (current = []) => [
        { ...response.incident },
        ...current.filter((incident) => incident.id !== response.incident.id)
      ]);
      workspace.setSelectedIncidentId(response.incident.id);
      setManualStatus("Инцидент создан через Generic ingest");
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: () => setManualStatus("Не удалось создать инцидент через Generic ingest.")
  });

  if (!incidents.length && !incidentsQuery.isLoading) {
    return (
      <div className="assistant-page">
        <section className="ops-panel manual-incident-card">
          <div className="panel-heading compact">
            <div>
              <span className="eyebrow">Generic ingest</span>
              <h2>Создать инцидент вручную</h2>
              <p>Добавьте сигнал без внешних адаптеров. Форма использует тот же endpoint, что custom monitoring systems.</p>
            </div>
          </div>
          <form className="manual-incident-form" onSubmit={(event) => {
            event.preventDefault();
            manualMutation.mutate();
          }}>
            <input aria-label="Сервис" value={manualForm.serviceName} onChange={(event) => setManualForm((current) => ({ ...current, serviceName: event.target.value }))} />
            <select aria-label="Критичность" value={manualForm.severity} onChange={(event) => setManualForm((current) => ({ ...current, severity: event.target.value }))}>
              <option value="critical">Критичный</option>
              <option value="warning">Предупреждение</option>
              <option value="info">Информационный</option>
            </select>
            <textarea aria-label="Описание сигнала" value={manualForm.message} onChange={(event) => setManualForm((current) => ({ ...current, message: event.target.value }))} />
            <Button type="submit" disabled={manualMutation.isPending || !manualForm.serviceName.trim() || !manualForm.message.trim()}>
              {manualMutation.isPending ? "Создаём..." : "Создать инцидент"}
            </Button>
          </form>
          {manualStatus ? <div className="inline-status small" role="status"><Info size={15} />{manualStatus}</div> : null}
        </section>
        <section className="ops-panel">
          <EmptyState
            title="Инцидентов пока нет"
            description="AI-ассистент работает только с контекстом конкретного инцидента. Запустите сценарий, чтобы начать диалог."
          >
            <Button asChild>
              <Link to="/dashboard">Запустить демонстрационный сценарий</Link>
            </Button>
          </EmptyState>
        </section>
      </div>
    );
  }

  return (
    <div className="assistant-page">
      {incidentQuery.isFetching ? (
        <div className="inline-status" role="status">
          <Info size={16} />
          Загружаю контекст инцидента...
        </div>
      ) : null}
      <section className="assistant-setup-grid">
        <article className="ops-panel manual-incident-card">
          <div className="panel-heading compact">
            <div>
              <span className="eyebrow">Generic ingest</span>
              <h2>Создать инцидент вручную</h2>
              <p>Для ad-hoc сигнала: сервис, описание, лог/метрика/deploy context. В production этот же поток подключает custom adapters.</p>
            </div>
            <StatusPill tone="adapter">source: manual</StatusPill>
          </div>
          <form className="manual-incident-form" onSubmit={(event) => {
            event.preventDefault();
            manualMutation.mutate();
          }}>
            <label>
              <span>Сервис</span>
              <input value={manualForm.serviceName} onChange={(event) => setManualForm((current) => ({ ...current, serviceName: event.target.value }))} />
            </label>
            <label>
              <span>Критичность</span>
              <select value={manualForm.severity} onChange={(event) => setManualForm((current) => ({ ...current, severity: event.target.value }))}>
                <option value="critical">Критичный</option>
                <option value="warning">Предупреждение</option>
                <option value="info">Информационный</option>
              </select>
            </label>
            <label className="manual-incident-form__wide">
              <span>Описание сигнала</span>
              <textarea value={manualForm.message} onChange={(event) => setManualForm((current) => ({ ...current, message: event.target.value }))} />
            </label>
            <label>
              <span>Лог</span>
              <textarea value={manualForm.logSnippet} onChange={(event) => setManualForm((current) => ({ ...current, logSnippet: event.target.value }))} />
            </label>
            <label>
              <span>Метрика</span>
              <textarea value={manualForm.metricSnippet} onChange={(event) => setManualForm((current) => ({ ...current, metricSnippet: event.target.value }))} />
            </label>
            <label className="manual-incident-form__wide">
              <span>Deploy context</span>
              <input value={manualForm.deployEvent} onChange={(event) => setManualForm((current) => ({ ...current, deployEvent: event.target.value }))} placeholder="например: deploy branch feat/catalog-cache" />
            </label>
            <Button type="submit" disabled={manualMutation.isPending || !manualForm.serviceName.trim() || !manualForm.message.trim()}>
              {manualMutation.isPending ? "Создаём..." : "Создать через Generic ingest"}
            </Button>
          </form>
          {manualStatus ? <div className="inline-status small" role="status"><Info size={15} />{manualStatus}</div> : null}
        </article>

        <article className="ops-panel knowledge-base-card">
          <div className="settings-card__icon" aria-hidden="true">
            <BookOpenCheck size={22} />
          </div>
          <span className="eyebrow">Следующий шаг</span>
          <h2>Runbook / Knowledge base</h2>
          <p>
            В production ассистент сможет учитывать runbooks, ownership, историю инцидентов и service notes.
            Для этого нужны storage, parsing, access control и audit log.
          </p>
          <Button type="button" variant="outline" disabled title="В roadmap">
            <UploadCloud size={16} />
            Загрузить runbook
          </Button>
        </article>
      </section>
      <AssistantWorkspace
        incidents={incidents}
        selectedIncident={incidentQuery.data}
        role={workspace.role}
        onSelect={(id) => workspace.setSelectedIncidentId(id)}
      />
    </div>
  );
}
