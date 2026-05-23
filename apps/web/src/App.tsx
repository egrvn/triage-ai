import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  DatabaseZap,
  GitBranch,
  MessageSquare,
  Play,
  RefreshCw,
  Search,
  ServerCog,
  Settings,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { IncidentDetail, IncidentListItem, IntegrationSetting, ScenarioSummary } from "@coursework/shared";
import { EmptyState } from "./components/EmptyState";
import { StatusPill } from "./components/StatusPill";
import { api } from "./lib/api";

type ViewMode = "dashboard" | "settings";
type RoleMode = "oncall" | "escalation";

function formatClock(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(value));
}

function confidenceLabel(confidence?: string) {
  if (confidence === "high") return "High";
  if (confidence === "medium") return "Medium";
  if (confidence === "low") return "Low";
  return "Pending";
}

function severityIcon(severity: IncidentListItem["severity"]) {
  if (severity === "critical") return <AlertTriangle size={16} />;
  if (severity === "warning") return <CircleDot size={16} />;
  return <CheckCircle2 size={16} />;
}

export function App() {
  const queryClient = useQueryClient();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [roleMode, setRoleMode] = useState<RoleMode>("oncall");
  const [explainOpen, setExplainOpen] = useState(true);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const scenariosQuery = useQuery({ queryKey: ["scenarios"], queryFn: api.scenarios });
  const incidentsQuery = useQuery({ queryKey: ["incidents"], queryFn: api.incidents });
  const integrationsQuery = useQuery({ queryKey: ["integrations"], queryFn: api.integrations });
  const incidents = incidentsQuery.data ?? [];
  const activeIncidentId = selectedIncidentId ?? incidents[0]?.id ?? null;
  const incidentQuery = useQuery({
    queryKey: ["incident", activeIncidentId],
    queryFn: () => api.incident(activeIncidentId!),
    enabled: Boolean(activeIncidentId)
  });

  const selectedIncident = incidentQuery.data ?? null;
  const scenarios = scenariosQuery.data ?? [];
  const integrations = integrationsQuery.data ?? [];

  const runScenarioMutation = useMutation({
    mutationFn: api.runScenario,
    onSuccess: async (result) => {
      setSelectedIncidentId(result.incident.id);
      setFeedbackSent(false);
      setExplainOpen(true);
      await queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.setQueryData(["incident", result.incident.id], result.incident);
    }
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ id, verdict }: { id: string; verdict: "correct" | "incorrect" }) =>
      api.sendFeedback(id, {
        usefulness: verdict === "correct" ? "useful" : "not_useful",
        hypothesisVerdict: verdict
      }),
    onSuccess: () => setFeedbackSent(true)
  });

  const activeIncident = activeIncidentId
    ? incidents.find((incident) => incident.id === activeIncidentId)
    : undefined;

  const stats = useMemo(() => {
    const critical = incidents.filter((incident) => incident.severity === "critical").length;
    const explained = incidents.filter((incident) => incident.confidence).length;
    const lowConfidence = incidents.filter((incident) => incident.confidence === "low").length;
    return { critical, explained, lowConfidence };
  }, [incidents]);

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div className="brand-block">
          <div className="brand-mark">T</div>
          <div>
            <strong>Triage AI</strong>
            <span>Cloud.ru MVP</span>
          </div>
        </div>

        <nav className="nav-list">
          <button className={viewMode === "dashboard" ? "active" : ""} onClick={() => setViewMode("dashboard")}>
            <ServerCog size={18} />
            Dashboard
          </button>
          <button className={viewMode === "settings" ? "active" : ""} onClick={() => setViewMode("settings")}>
            <Settings size={18} />
            Integrations
          </button>
        </nav>

        <div className="role-switch">
          <span>Demo role</span>
          <div>
            <button className={roleMode === "oncall" ? "active" : ""} onClick={() => setRoleMode("oncall")}>
              On-call
            </button>
            <button className={roleMode === "escalation" ? "active" : ""} onClick={() => setRoleMode("escalation")}>
              Escalation
            </button>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="top-bar">
          <div>
            <h1>{viewMode === "dashboard" ? "Incident triage console" : "Mock integrations"}</h1>
            <p>
              {viewMode === "dashboard"
                ? "Reactive MVP: auto-summary, root-cause hypothesis, deploy correlation, explainability."
                : "Adapter boundaries are visible; mock mode keeps the defense demo runnable without secrets."}
            </p>
          </div>
          <button className="ghost-button" onClick={() => void queryClient.invalidateQueries()}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        {viewMode === "dashboard" ? (
          <div className="dashboard-grid">
            <section className="ops-panel scenario-panel">
              <div className="panel-heading">
                <div>
                  <h2>Demo scenarios</h2>
                  <p>Run synthetic Prometheus/ELK slices end-to-end.</p>
                </div>
                <StatusPill tone="mock">mock data</StatusPill>
              </div>
              <div className="scenario-list">
                {scenarios.map((scenario) => (
                  <ScenarioButton
                    key={scenario.id}
                    scenario={scenario}
                    isLoading={runScenarioMutation.isPending}
                    onRun={() => runScenarioMutation.mutate(scenario.id)}
                  />
                ))}
              </div>
            </section>

            <section className="ops-panel metrics-strip">
              <MetricTile label="Critical active" value={stats.critical} icon={<AlertTriangle size={18} />} tone="critical" />
              <MetricTile label="AI analyzed" value={stats.explained} icon={<Bot size={18} />} tone="info" />
              <MetricTile label="Low confidence" value={stats.lowConfidence} icon={<ShieldCheck size={18} />} tone="warning" />
            </section>

            <section className="ops-panel incident-queue">
              <div className="panel-heading">
                <div>
                  <h2>Incident queue</h2>
                  <p>Shared context for on-call and escalation roles.</p>
                </div>
              </div>
              {incidents.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="incident-list">
                  {incidents.map((incident) => (
                    <button
                      key={incident.id}
                      className={`incident-row ${activeIncident?.id === incident.id ? "active" : ""}`}
                      onClick={() => {
                        setSelectedIncidentId(incident.id);
                        setFeedbackSent(false);
                      }}
                    >
                      <span className={`severity severity--${incident.severity}`}>{severityIcon(incident.severity)}</span>
                      <span className="incident-main">
                        <strong>{incident.title}</strong>
                        <small>{incident.serviceName} · detected {formatClock(incident.detectedAt)}</small>
                      </span>
                      <StatusPill tone={incident.confidence ?? "active"}>{confidenceLabel(incident.confidence)}</StatusPill>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <IncidentPanel
              incident={selectedIncident}
              selectedId={activeIncidentId}
              isLoading={incidentQuery.isLoading}
              roleMode={roleMode}
              explainOpen={explainOpen}
              setExplainOpen={setExplainOpen}
              feedbackSent={feedbackSent}
              onFeedback={(verdict) => {
                if (selectedIncident) {
                  feedbackMutation.mutate({ id: selectedIncident.id, verdict });
                }
              }}
            />
          </div>
        ) : (
          <SettingsView integrations={integrations} />
        )}
      </main>
    </div>
  );
}

function ScenarioButton({ scenario, isLoading, onRun }: { scenario: ScenarioSummary; isLoading: boolean; onRun: () => void }) {
  return (
    <button className="scenario-button" onClick={onRun} disabled={isLoading}>
      <span>
        <strong>{scenario.name}</strong>
        <small>{scenario.incidentType} · {scenario.serviceName}</small>
      </span>
      {scenario.recommended ? <StatusPill tone="info">core demo</StatusPill> : null}
      <Play size={16} />
    </button>
  );
}

function MetricTile({ label, value, icon, tone }: { label: string; value: number; icon: ReactNode; tone: string }) {
  return (
    <div className={`metric-tile metric-tile--${tone}`}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function IncidentPanel({
  incident,
  selectedId,
  isLoading,
  roleMode,
  explainOpen,
  setExplainOpen,
  feedbackSent,
  onFeedback
}: {
  incident: IncidentDetail | null;
  selectedId: string | null;
  isLoading: boolean;
  roleMode: RoleMode;
  explainOpen: boolean;
  setExplainOpen: (value: boolean) => void;
  feedbackSent: boolean;
  onFeedback: (verdict: "correct" | "incorrect") => void;
}) {
  if (!selectedId) {
    return (
      <section className="ops-panel incident-detail">
        <EmptyState />
      </section>
    );
  }

  if (!incident || isLoading) {
    return (
      <section className="ops-panel incident-detail">
        <div className="loading-state">Loading incident context...</div>
      </section>
    );
  }

  const chartData = incident.metrics.map((metric) => ({
    time: formatClock(metric.timestamp),
    name: metric.name,
    value: metric.name.includes("rate") ? Number((metric.value * 100).toFixed(2)) : metric.value
  }));

  return (
    <section className="ops-panel incident-detail">
      <div className="incident-header">
        <div>
          <span className="mono-label">{incident.serviceName}</span>
          <h2>{incident.title}</h2>
          <p>
            {roleMode === "oncall"
              ? "Use the summary to validate the first working hypothesis."
              : "Escalation view: start from the incident card instead of rebuilding context."}
          </p>
        </div>
        <div className="incident-header-actions">
          <StatusPill tone={incident.severity}>{incident.severity}</StatusPill>
          <StatusPill tone={incident.analysis?.confidence ?? "active"}>{confidenceLabel(incident.analysis?.confidence)}</StatusPill>
        </div>
      </div>

      {incident.analysis?.confidence === "low" ? (
        <div className="fallback-banner">
          <ShieldCheck size={18} />
          AI is not confident. The system shows collected context and avoids a fake root-cause claim.
        </div>
      ) : null}

      <div className="analysis-grid">
        <article className="analysis-card primary-analysis">
          <span className="card-kicker"><Bot size={14} /> AI summary</span>
          <p>{incident.analysis?.summary ?? "Analysis is pending. Run a scenario to generate a summary."}</p>
        </article>
        <article className="analysis-card">
          <span className="card-kicker"><Search size={14} /> Root-cause hypothesis</span>
          <p>{incident.analysis?.hypothesis ?? "No hypothesis yet."}</p>
          <strong>Next step: {incident.analysis?.nextStep ?? "Collect more context."}</strong>
        </article>
      </div>

      <div className="evidence-layout">
        <div className="chart-panel">
          <div className="panel-heading compact">
            <div>
              <h3>Metric slice</h3>
              <p>Prometheus-like samples attached to this incident.</p>
            </div>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <XAxis dataKey="time" tick={{ fill: "#6f7684", fontSize: 11 }} />
                <YAxis tick={{ fill: "#6f7684", fontSize: 11 }} width={44} />
                <Tooltip contentStyle={{ background: "#11151c", border: "1px solid #273142", borderRadius: 6 }} />
                <Line type="monotone" dataKey="value" stroke="#4f7cff" strokeWidth={2.4} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="timeline-panel">
          <div className="panel-heading compact">
            <div>
              <h3>Deploy correlation</h3>
              <p>Recent releases checked before recommending mitigation.</p>
            </div>
          </div>
          <div className="deploy-list">
            {incident.deploys.length === 0 ? (
              <span className="muted-line">No deploy events in the incident window.</span>
            ) : (
              incident.deploys.map((deploy) => (
                <div key={deploy.id} className="deploy-row">
                  <GitBranch size={15} />
                  <div>
                    <strong>{deploy.branch}</strong>
                    <small>{deploy.commitSha} · {formatClock(deploy.timestamp)} · {deploy.summary}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <button className="explain-toggle" onClick={() => setExplainOpen(!explainOpen)}>
        <DatabaseZap size={16} />
        Explain why
        <ChevronRight className={explainOpen ? "rotated" : ""} size={16} />
      </button>

      {explainOpen ? (
        <div className="evidence-drawer">
          {(incident.analysis?.evidence ?? []).map((item) => (
            <div key={item.id} className="evidence-item">
              <StatusPill tone={item.kind === "deploy" ? "adapter" : "mock"}>{item.kind}</StatusPill>
              <div>
                <strong>{item.title}</strong>
                <p>{item.quote}</p>
              </div>
              <span className="weight">{Math.round(item.weight * 100)}%</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="feedback-bar">
        <span>{feedbackSent ? "Feedback captured for pilot metrics." : "Was this AI hypothesis useful?"}</span>
        <button onClick={() => onFeedback("correct")} disabled={feedbackSent}>
          <ThumbsUp size={15} />
          Useful
        </button>
        <button onClick={() => onFeedback("incorrect")} disabled={feedbackSent}>
          <ThumbsDown size={15} />
          Not useful
        </button>
      </div>
    </section>
  );
}

function SettingsView({ integrations }: { integrations: IntegrationSetting[] }) {
  return (
    <section className="settings-grid">
      {integrations.map((integration) => (
        <article key={integration.kind} className="ops-panel integration-card">
          <div className="integration-icon">
            {integration.kind === "llm" ? <Bot size={20} /> : integration.kind === "telegram" || integration.kind === "slack" || integration.kind === "email" ? <MessageSquare size={20} /> : <DatabaseZap size={20} />}
          </div>
          <div>
            <h2>{integration.displayName}</h2>
            <p>{integration.description}</p>
          </div>
          <StatusPill tone={integration.mode}>{integration.mode}</StatusPill>
          <StatusPill tone={integration.status === "healthy" ? "active" : integration.status === "disabled" ? "disabled" : "warning"}>
            {integration.status}
          </StatusPill>
        </article>
      ))}
    </section>
  );
}
