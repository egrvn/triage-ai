import type { IntegrationSetting } from "@triage-ai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Clipboard,
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
  if (!integration.enabled || integration.status === "disabled") return "отключено";
  if (integration.mode === "mock") return "тестовый режим";
  if (integration.status === "needs_config") return "нужна настройка";
  return "работает";
}

function IntegrationDetails({
  integration,
  isTesting,
  statusMessage,
  onTest,
  onConfigure,
  onCopy
}: {
  integration?: IntegrationSetting;
  isTesting: boolean;
  statusMessage: string;
  onTest: (kind: IntegrationSetting["kind"]) => void;
  onConfigure: (integration: IntegrationSetting) => void;
  onCopy: (payload: string) => void;
}) {
  if (!integration) {
    return (
      <section className="ops-panel integration-detail">
        <EmptyState title="Выберите интеграцию" description="Откройте детали, чтобы увидеть пример payload и требования для production-подключения." />
      </section>
    );
  }

  const samplePayload = JSON.stringify(integration.samplePayload ?? { mode: integration.mode }, null, 2);

  return (
    <section className="ops-panel integration-detail">
      <div className="incident-header">
        <div>
          <span className="eyebrow">Детали интеграции</span>
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
        <Button type="button" variant="outline" onClick={() => onConfigure(integration)}>
          <Settings2 size={16} />
          Настроить
        </Button>
      </div>

      {statusMessage ? <div className="inline-status small" role="status">{statusMessage}</div> : null}

      <div className="details-grid">
        <article className="detail-stat">
          <span>Режим</span>
          <strong>{integration.mode === "mock" ? "тестовый режим" : integration.mode === "disabled" ? "отключено" : "adapter"}</strong>
        </article>
        <article className="detail-stat">
          <span>Последняя проверка</span>
          <strong>{formatDateTime(integration.lastCheck)}</strong>
        </article>
      </div>

      <div className="code-block-section">
        <div className="code-block-section__header">
          <h3>Пример payload</h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => onCopy(samplePayload)}>
            <Clipboard size={15} />
            Скопировать
          </Button>
        </div>
        <pre><code>{samplePayload}</code></pre>
      </div>

      <div className="requirements-list">
        <h3>Требования для production</h3>
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
          Интеграция отключена. Для production-подключения потребуется настроить endpoint, credentials и secrets management.
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
      setStatusMessage(response.sampleAccepted ? "Тестовое подключение проверено, статус обновлён" : "Интеграция отключена: пример payload не отправлялся");
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
          placeholder="Искать интеграцию, статус или канал..."
        />
      </section>

      <div className="mock-callout wide">
        Сейчас приложение работает в тестовом режиме. Данные синтетические и предназначены для демонстрации полного цикла разбора инцидента.
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
                  <span>последняя проверка: {formatDateTime(integration.lastCheck)}</span>
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
          onConfigure={(integration) => {
            setStatusMessage(integration.enabled
              ? "Интеграция уже работает в тестовом режиме. Для production нужны параметры из списка требований."
              : "Для подключения в production настройте endpoint, credentials и secrets management."
            );
          }}
          onCopy={(payload) => {
            void navigator.clipboard?.writeText(payload);
            setStatusMessage("Payload скопирован");
          }}
        />
      </div>
    </div>
  );
}
