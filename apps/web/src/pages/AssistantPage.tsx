import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { AssistantWorkspace } from "@/features/incidents/assistant";
import { useIncidentWorkspace } from "@/features/incidents/incident-workspace";
import { api } from "@/lib/api";

export function AssistantPage() {
  const workspace = useIncidentWorkspace();
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

  if (!incidents.length && !incidentsQuery.isLoading) {
    return (
      <div className="assistant-page">
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
      <AssistantWorkspace
        incidents={incidents}
        selectedIncident={incidentQuery.data}
        role={workspace.role}
        onSelect={(id) => workspace.setSelectedIncidentId(id)}
      />
    </div>
  );
}
