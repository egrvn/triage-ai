import type { IntegrationSetting } from "@coursework/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Mail,
  MessageCircle,
  RadioTower,
  RefreshCcw,
  Search,
  Settings2,
  Slack,
  TerminalSquare
} from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import { AnimatedGlowingSearchBar } from "@/components/ui/animated-glowing-search-bar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/labels";

const integrationIcons = {
  prometheus: RadioTower,
  elk: TerminalSquare,
  telegram: MessageCircle,
  slack: Slack,
  email: Mail,
  llm: Bot
} satisfies Record<IntegrationSetting["kind"], ComponentType<{ size?: number; className?: string }>>;

function integrationStatusLabel(integration: IntegrationSetting) {
  if (!integration.enabled || integration.status === "disabled") return "disabled";
  if (integration.mode === "mock") return "mock / healthy";
  if (integration.status === "needs_config") return "needs config";
  return "healthy";
}

function IntegrationDetails({
  integration,
  isTesting,
  statusMessage,
  onTest
}: {
  integration?: IntegrationSetting;
  isTesting: boolean;
  statusMessage: string;
  onTest: (kind: IntegrationSetting["kind"]) => void;
}) {
  if (!integration) {
    return (
      <section className="ops-panel integration-detail">
        <EmptyState title="Выберите интеграцию" description="Откройте details, чтобы увидеть sample payload и production requirements." />
      </section>
    );
  }

  const samplePayload = JSON.stringify(integration.samplePayload ?? { mode: integration.mode }, null, 2);

  return (
    <section className="ops-panel integration-detail">
      <div className="incident-header">
        <div>
          <span className="eyebrow">Integration details</span>
          <h2>{integration.displayName}</h2>
          <p>{integration.description}</p>
        </div>
        <StatusPill tone={integration.status}>{integrationStatusLabel(integration)}</StatusPill>
      </div>

      <div className="integration-detail__actions">
        <Button type="button" onClick={() => onTest(integration.kind)} disabled={isTesting}>
          <RefreshCcw size={16} className={isTesting ? "spin" : ""} />
          Проверить
        </Button>
        <Button type="button" variant="outline" disabled={integration.enabled}>
          <Settings2 size={16} />
          Настроить
        </Button>
      </div>

      {statusMessage ? <div className="inline-status small" role="status">{statusMessage}</div> : null}

      <div className="details-grid">
        <article className="detail-stat">
          <span>Режим</span>
          <strong>{integration.mode}</strong>
        </article>
        <article className="detail-stat">
          <span>Последняя проверка</span>
          <strong>{formatDateTime(integration.lastCheck)}</strong>
        </article>
      </div>

      <div className="code-block-section">
        <h3>Sample payload</h3>
        <pre><code>{samplePayload}</code></pre>
      </div>

      <div className="requirements-list">
        <h3>Production requirements</h3>
        {integration.productionRequirements.length ? (
          <ul>
            {integration.productionRequirements.map((requirement) => (
              <li key={requirement}>
                <CheckCircle2 size={15} />
                {requirement}
              </li>
            ))}
          </ul>
        ) : (
          <p>Для этой интеграции требования пока не заданы.</p>
        )}
      </div>

      {!integration.enabled ? (
        <div className="mock-callout">
          Интеграция отключена. Для production подключения потребуется настроить endpoint, credentials и secrets management.
        </div>
      ) : null}
    </section>
  );
}

export function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedKind, setSelectedKind] = useState<IntegrationSetting["kind"] | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const integrationsQuery = useQuery({ queryKey: ["integrations"], queryFn: api.integrations });
  const integrations = integrationsQuery.data ?? [];

  const normalizedSearch = search.trim().toLowerCase();
  const filteredIntegrations = useMemo(() => {
    if (!normalizedSearch) return integrations;
    return integrations.filter((integration) => [
      integration.displayName,
      integration.kind,
      integration.mode,
      integration.status,
      integration.description
    ].some((value) => value.toLowerCase().includes(normalizedSearch)));
  }, [integrations, normalizedSearch]);

  const selectedIntegration = integrations.find((integration) => integration.kind === selectedKind) ?? filteredIntegrations[0];

  const testMutation = useMutation({
    mutationFn: api.testIntegration,
    onSuccess: (response) => {
      queryClient.setQueryData<IntegrationSetting[]>(["integrations"], (current = []) =>
        current.map((integration) => integration.kind === response.integration.kind ? response.integration : integration)
      );
      setSelectedKind(response.integration.kind);
      setStatusMessage(response.sampleAccepted ? "Mock connection проверен, status обновлен" : "Интеграция отключена: sample не отправлялся");
    },
    onError: () => setStatusMessage("Не удалось проверить интеграцию.")
  });

  const submitSearch = () => {
    if (filteredIntegrations[0]) {
      setSelectedKind(filteredIntegrations[0].kind);
      setStatusMessage("Найденная интеграция открыта");
    } else {
      setStatusMessage("Ничего не найдено. Измените запрос или фильтры.");
    }
  };

  return (
    <div className="integrations-page">
      <section className="dashboard-toolbar">
        <AnimatedGlowingSearchBar
          value={search}
          onChange={setSearch}
          onSubmit={submitSearch}
          placeholder="Искать Prometheus, ELK, Slack..."
        />
      </section>

      <div className="mock-callout wide">
        Сейчас приложение работает в mock mode. Данные synthetic и предназначены для демонстрации end-to-end triage flow.
      </div>

      <div className="integrations-layout">
        <section className="integration-grid" aria-label="Интеграции">
          {filteredIntegrations.map((integration) => {
            const Icon = integrationIcons[integration.kind];
            return (
              <article key={integration.kind} className={`integration-card ${selectedIntegration?.kind === integration.kind ? "active" : ""}`}>
                <div className="integration-card__header">
                  <div className="integration-icon">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h2>{integration.displayName}</h2>
                    <p>{integration.description}</p>
                  </div>
                </div>
                <div className="integration-card__meta">
                  <StatusPill tone={integration.status}>{integrationStatusLabel(integration)}</StatusPill>
                  <span>last check: {formatDateTime(integration.lastCheck)}</span>
                </div>
                <div className="integration-card__actions">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedKind(integration.kind)}>
                    Подробнее
                    <ChevronRight size={15} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={testMutation.isPending}
                    onClick={() => testMutation.mutate(integration.kind)}
                  >
                    <Search size={15} />
                    Проверить
                  </Button>
                </div>
              </article>
            );
          })}
          {!filteredIntegrations.length ? (
            <EmptyState title="Ничего не найдено" description="Измените запрос или фильтры и попробуйте снова." />
          ) : null}
        </section>

        <IntegrationDetails
          integration={selectedIntegration}
          isTesting={testMutation.isPending}
          statusMessage={statusMessage}
          onTest={(kind) => testMutation.mutate(kind)}
        />
      </div>
    </div>
  );
}
