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

const llmProviders = [
  {
    kind: "mock",
    name: "Тестовый provider",
    status: "active",
    configured: true,
    active: true,
    storagePolicy: "backend memory / без внешних ключей",
    dataPolicy: "Синтетические данные остаются в тестовом контуре.",
    sample: {
      prompt: "Сформируй сводку по incident context payment-svc.",
      output: "Вероятна регрессия после развертывания; проверьте рост HTTP 5xx и логи RetryBudgetExceeded."
    }
  },
  {
    kind: "yandexgpt",
    name: "YandexGPT",
    status: "needs_config",
    configured: false,
    active: false,
    storagePolicy: "backend env / secrets manager",
    dataPolicy: "Production-подключение требует согласованной политики передачи логов и метрик.",
    sample: {
      prompt: "Incident context -> summary, hypothesis, confidence.",
      output: "needs_config: внешний вызов не выполнялся."
    }
  },
  {
    kind: "gigachat",
    name: "GigaChat",
    status: "needs_config",
    configured: false,
    active: false,
    storagePolicy: "backend env / secrets manager",
    dataPolicy: "Нужны approvals, masking и audit log перед production-подключением.",
    sample: {
      prompt: "Evidence refs + timeline -> recommended next step.",
      output: "needs_config: provider не настроен."
    }
  },
  {
    kind: "openai",
    name: "OpenAI",
    status: "needs_config",
    configured: false,
    active: false,
    storagePolicy: "backend env / secrets manager",
    dataPolicy: "Ключи не передаются во frontend; требуется data handling policy.",
    sample: {
      prompt: "Explain hypothesis using only evidence ids.",
      output: "needs_config: backend env отсутствует."
    }
  },
  {
    kind: "custom",
    name: "Custom endpoint",
    status: "needs_config",
    configured: false,
    active: false,
    storagePolicy: "backend env / secrets manager",
    dataPolicy: "Для self-hosted/OpenAI-compatible endpoint нужны endpoint allowlist и TLS policy.",
    sample: {
      prompt: "Analyze incident context with citations.",
      output: "needs_config: endpoint не задан."
    }
  }
] as const;

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
  const [providerStatus, setProviderStatus] = useState("");

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

      <section className="ops-panel llm-provider-section">
        <div className="llm-provider-section__heading">
          <div>
            <span className="eyebrow">Провайдеры ИИ</span>
            <h2>Подключение провайдеров ИИ</h2>
            <p>
              Frontend не принимает и не хранит API-ключи. Production-подключения настраиваются только через
              backend env или secrets manager.
            </p>
          </div>
          {providerStatus ? <div className="inline-status small" role="status">{providerStatus}</div> : null}
        </div>

        <div className="llm-provider-grid">
          {llmProviders.map((provider) => (
            <article key={provider.kind} className={`llm-provider-card ${provider.active ? "active" : ""}`}>
              <div className="llm-provider-card__top">
                <div className="integration-icon">
                  <Bot size={20} aria-hidden="true" />
                </div>
                <div className="llm-provider-card__title">
                  <h3>{provider.name}</h3>
                  <p>{provider.dataPolicy}</p>
                </div>
                <StatusPill tone={provider.status === "active" ? "healthy" : "needs_config"}>
                  {provider.status === "active" ? "активен" : "нужна настройка"}
                </StatusPill>
              </div>

              <div className="provider-info-grid">
                <article>
                  <span>Настроен</span>
                  <strong>{provider.configured ? "да" : "нет"}</strong>
                </article>
                <article>
                  <span>Хранение ключей</span>
                  <strong>{provider.storagePolicy}</strong>
                </article>
              </div>

              <details className="provider-sample">
                <summary>Показать пример prompt/output</summary>
                <pre><code>{JSON.stringify(provider.sample, null, 2)}</code></pre>
              </details>

              <div className="integration-card__actions">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProviderStatus(provider.configured
                    ? `${provider.name}: проверка выполнена`
                    : `${provider.name}: нужна настройка backend env / secrets manager`
                  )}
                >
                  <Search size={15} aria-hidden="true" />
                  Проверить подключение
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!provider.configured || provider.active}
                  onClick={() => setProviderStatus(`${provider.name}: provider уже активен в тестовом режиме`)}
                >
                  Сделать активным
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
