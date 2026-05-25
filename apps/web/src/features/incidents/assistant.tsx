import type { IncidentChatMessage, IncidentChatRequest, IncidentDetail, IncidentListItem } from "@triage-ai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, ExternalLink, Loader2, MessageSquareText, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ConfidenceBadge, SeverityBadge, StatusBadge } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { confidenceLabel, formatClock } from "@/lib/labels";
import type { RoleMode } from "./incident-workspace";

const onCallCommands = [
  "Что проверить первым?",
  "Покажи ключевые логи",
  "Что изменилось перед инцидентом?",
  "Как снизить impact?",
  "Нужен ли rollback?",
  "Объясни гипотезу",
  "Какие evidence самые сильные?",
  "Подготовь сводку для эскалации",
  "Постмортем"
];

const escalationCommands = [
  "Подготовь сводку для эскалации",
  "Какие доказательства важны?",
  "Что уже проверил дежурный?",
  "Покажи timeline",
  "Объясни гипотезу",
  "Покажи ключевые логи",
  "Постмортем"
];

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const fallbackAssistantResponses = [
  {
    keywords: ["что проверить первым", "проверить первым", "first"],
    answer:
      "Сначала проверьте свежие изменения перед инцидентом: deploy, feature flags, конфигурацию, миграции и изменения трафика. Затем сопоставьте время изменения с метриками и логами. Если confidence низкая, не считать гипотезу доказанной без ручной проверки."
  },
  {
    keywords: ["покажи ключевые логи", "ключевые логи", "логи", "log", "error"],
    answer:
      "Ключевые логи: последние warn/error записи вокруг времени инцидента, записи по profile/session/request-id, а также события рядом с 09:55. Полный список должен открываться в отдельном окне, но краткая сводка должна отображаться прямо здесь."
  },
  {
    keywords: ["что изменилось", "перед инцидентом", "изменилось перед", "deploy", "развертывание"],
    answer:
      "Проверьте изменения перед инцидентом: последний deploy, конфигурационные изменения, feature flags, миграции, изменения маршрутизации, рост трафика и изменения внешних зависимостей."
  },
  {
    keywords: ["как снизить impact", "снизить impact", "уменьшить impact", "impact"],
    answer:
      "Для снижения impact: ограничьте затронутый сегмент, отключите подозрительный feature flag, уменьшите rollout/canary, включите rate limit или fallback. Rollback рассматривать только при подтверждённой связи с последним изменением."
  },
  {
    keywords: ["нужен ли rollback", "rollback", "роллбек", "откат"],
    answer:
      "Rollback нужен, если есть сильная корреляция с последним deploy/config change и impact продолжает расти. Если evidence слабые, сначала проверьте метрики, логи и изменения, чтобы не откатить нерелевантное изменение."
  },
  {
    keywords: ["объясни гипотезу", "гипотеза", "почему система так считает"],
    answer:
      "Гипотеза низкой уверенности: значения метрик не пересекают сильный rule threshold, связи со свежим развертыванием нет, доступные логи недостаточно специфичны для уверенной рекомендации. Поэтому гипотеза требует ручной проверки и не считается доказанной причиной."
  },
  {
    keywords: ["evidence", "самые сильные evidence", "доказательства"],
    answer:
      "Самые сильные evidence: совпадение времени симптомов с изменениями, устойчивый рост error/warn-метрик, повторяемость по одному endpoint/profile/request group, наличие свежего deploy/config change. Сейчас evidence слабые, поэтому confidence остаётся низкой."
  },
  {
    keywords: ["сводку для эскалации", "эскалация", "подготовь сводку"],
    answer:
      "Сводка для эскалации: инцидент с низкой уверенностью гипотезы. Метрики не пересекают сильный threshold, связи со свежим deploy нет, логи недостаточно специфичны. Нужна ручная проверка изменений, логов, affected-сегмента и решения по rollback."
  },
  {
    keywords: ["постмортем", "postmortem"],
    answer:
      "Постмортем пока рано формировать: причина не подтверждена. Сначала нужно подтвердить impact, affected-сегмент, timeline, root cause и mitigation. После этого можно собрать postmortem."
  }
];

function normalizeAssistantQuery(value: string) {
  return value.trim().toLowerCase();
}

function getAssistantAnswer(rawQuery: string) {
  const query = normalizeAssistantQuery(rawQuery);

  if (!query) {
    return "Введите вопрос по выбранному инциденту или нажмите одну из быстрых команд.";
  }

  const matched = fallbackAssistantResponses.find((item) =>
    item.keywords.some((keyword) => query.includes(keyword))
  );

  if (!matched) {
    return "Такой запрос пока не обрабатывается скриптом. Ассистент работает только с контекстом выбранного инцидента: проверка гипотезы, метрики, логи, impact, rollback, evidence, эскалация и постмортем.";
  }

  return matched.answer;
}

function localUserMessage(incidentId: string, content: string): IncidentChatMessage {
  return {
    id: `local-user-${Date.now().toString(36)}`,
    incidentId,
    role: "user",
    content,
    createdAt: new Date().toISOString(),
    citations: [],
    suggestedActions: []
  };
}

function localAssistantMessage(incident: IncidentDetail, content: string): IncidentChatMessage {
  const evidence = incident.analysis?.evidence ?? [];
  return {
    id: `local-assistant-${Date.now().toString(36)}`,
    incidentId: incident.id,
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
    citations: evidence.slice(0, 3).map((item) => ({
      id: item.id,
      label: item.title,
      targetId: item.kind === "metric" ? `metric-${item.refId}` : item.kind === "log" ? `log-${item.refId}` : `deploy-${item.refId}`,
      source: "evidence"
    })),
    confidence: incident.confidence,
    suggestedActions: ["Проверить evidence", "Сверить timeline", "Зафиксировать следующий шаг"],
    auditId: `local-audit-${incident.id}`
  };
}

function scrollToCitation(targetId: string) {
  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function AssistantMessage({ message }: { message: IncidentChatMessage }) {
  return (
    <article className={`assistant-message assistant-message--${message.role}`}>
      <div className="assistant-message__bubble">
        <p>{message.content}</p>
        {message.citations.length ? (
          <div className="assistant-citations" aria-label="Ссылки на evidence">
            {message.citations.map((citation) => (
              <button key={`${message.id}-${citation.id}`} type="button" onClick={() => scrollToCitation(citation.targetId)}>
                {citation.label}
              </button>
            ))}
          </div>
        ) : null}
        {message.suggestedActions.length ? (
          <ul className="assistant-suggestions">
            {message.suggestedActions.slice(0, 3).map((action) => <li key={action}>{action}</li>)}
          </ul>
        ) : null}
        {message.role === "assistant" ? (
          <footer className="assistant-message__meta">
            {message.confidence ? <span>{confidenceLabel(message.confidence)}</span> : null}
            {message.auditId ? <code>{message.auditId}</code> : null}
          </footer>
        ) : null}
      </div>
    </article>
  );
}

function AssistantInput({
  disabled,
  loading,
  placeholder,
  onSubmit
}: {
  disabled?: boolean;
  loading?: boolean;
  placeholder: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const message = value.trim();
    if (!message || disabled || loading) return;
    setValue("");
    onSubmit(message);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="assistant-input">
      <textarea
        value={value}
        disabled={disabled || loading}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={2}
        maxLength={1200}
      />
      <div className="assistant-input__footer">
        <span>{value.length}/1200</span>
        <Button type="button" size="sm" disabled={!value.trim() || disabled || loading} onClick={submit}>
          {loading ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
          Отправить
        </Button>
      </div>
    </div>
  );
}

export function IncidentAssistantPanel({
  incident,
  role,
  compact = false
}: {
  incident?: IncidentDetail;
  role: RoleMode;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const commands = role === "on-call" ? onCallCommands : escalationCommands;
  const listRef = useRef<HTMLDivElement | null>(null);
  const chatQuery = useQuery({
    queryKey: ["incident-chat", incident?.id],
    queryFn: () => api.chatHistory(incident!.id),
    enabled: Boolean(incident)
  });

  const chatMutation = useMutation({
    mutationFn: async (payload: IncidentChatRequest) => {
      const [response] = await Promise.all([
        api.sendChatMessage(incident!.id, payload),
        wait(420)
      ]);
      return response;
    },
    onMutate: async (payload) => {
      if (!incident) return;
      await queryClient.cancelQueries({ queryKey: ["incident-chat", incident.id] });
      queryClient.setQueryData<IncidentChatMessage[]>(["incident-chat", incident.id], (current = []) => [
        ...current,
        localUserMessage(incident.id, payload.message)
      ]);
    },
    onSuccess: (response) => {
      if (!incident) return;
      queryClient.setQueryData<IncidentChatMessage[]>(["incident-chat", incident.id], (current = []) => [
        ...current.filter((message) => message.id !== response.message.id),
        response.message
      ]);
      void queryClient.invalidateQueries({ queryKey: ["incident-chat", incident?.id] });
    },
    onError: (_error, payload) => {
      if (!incident) return;
      queryClient.setQueryData<IncidentChatMessage[]>(["incident-chat", incident.id], (current = []) => [
        ...current,
        localAssistantMessage(incident, getAssistantAnswer(payload.message))
      ]);
    }
  });

  const sendAssistantMessage = (message: string, source: "quick-command" | "free-input") => {
    const value = message.trim();
    if (!value || !incident || chatMutation.isPending) return;
    chatMutation.mutate({
      message: value,
      quickCommand: source === "quick-command" ? value : undefined
    });
  };
  const messages = chatQuery.data ?? [];

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (typeof list.scrollTo === "function") {
      list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
      return;
    }
    list.scrollTop = list.scrollHeight;
  }, [messages.length, chatMutation.isPending]);
  const intro = useMemo<IncidentChatMessage | null>(() => {
    if (!incident || messages.length) return null;
    return {
      id: `intro-${incident.id}`,
      incidentId: incident.id,
      role: "assistant",
      content: `Я работаю только с контекстом ${incident.id}. Выберите быстрый вопрос или задайте свой, чтобы проверить гипотезу, evidence и следующий шаг.`,
      createdAt: new Date().toISOString(),
      citations: [],
      confidence: incident.confidence,
      suggestedActions: role === "on-call"
        ? ["Проверить impact", "Открыть ключевые логи", "Сверить последнее развертывание"]
        : ["Подготовить handoff", "Проверить evidence", "Скопировать summary"],
      auditId: `audit-${incident.id}`
    };
  }, [incident, messages.length, role]);

  return (
    <aside className={`incident-assistant-panel ${compact ? "compact" : ""}`} aria-label="AI-ассистент">
      <header className="incident-assistant-panel__header">
        <div className="assistant-avatar" aria-hidden="true">
          <Bot size={20} />
        </div>
        <div>
          <span className="eyebrow">AI-ассистент</span>
          <h2>Работа по контексту инцидента</h2>
          <p>{incident ? `Контекст: ${incident.id}` : "Выберите инцидент для анализа"}</p>
        </div>
      </header>

      {incident ? (
        <>
          <div className="assistant-quick-commands" aria-label="Быстрые команды">
            {commands.map((command) => (
              <button key={command} type="button" disabled={chatMutation.isPending} onClick={() => sendAssistantMessage(command, "quick-command")}>
                <MessageSquareText size={14} aria-hidden="true" />
                {command}
              </button>
            ))}
          </div>

          <div className="assistant-message-list" ref={listRef} aria-live="polite">
            {intro ? <AssistantMessage message={intro} /> : null}
            {messages.map((message) => <AssistantMessage key={message.id} message={message} />)}
            {chatMutation.isPending ? (
              <div className="assistant-loading">
                <Loader2 size={15} className="spin" aria-hidden="true" />
                AI-ассистент анализирует контекст...
              </div>
            ) : null}
          </div>

          <AssistantInput
            loading={chatMutation.isPending}
            placeholder={compact ? "Спросите по этому инциденту..." : "Задайте вопрос по выбранному инциденту..."}
            onSubmit={(message) => sendAssistantMessage(message, "free-input")}
          />
        </>
      ) : (
        <EmptyState
          title="Выберите инцидент для анализа"
          description="AI-ассистент работает только с контекстом конкретного инцидента и не отвечает как общий чат."
        />
      )}
    </aside>
  );
}

export function AssistantWorkspace({
  incidents,
  selectedIncident,
  role,
  onSelect
}: {
  incidents: IncidentListItem[];
  selectedIncident?: IncidentDetail;
  role: RoleMode;
  onSelect: (id: string) => void;
}) {
  useEffect(() => {
    if (!selectedIncident?.id) return;
    window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-incident-id="${selectedIncident.id}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [selectedIncident?.id]);

  return (
    <div className="assistant-workspace">
      <aside className="assistant-incident-list">
        <div className="panel-heading compact">
          <div>
            <span className="eyebrow">Контекст</span>
            <h2>Инциденты</h2>
            <p>Выберите карточку, чтобы ассистент отвечал только по её данным.</p>
          </div>
        </div>
        <div className="assistant-incident-list__items">
          {incidents.map((incident) => (
            <button
              key={incident.id}
              type="button"
              data-incident-id={incident.id}
              className={selectedIncident?.id === incident.id ? "active" : ""}
              onClick={() => onSelect(incident.id)}
            >
              <strong>{incident.title}</strong>
              <span>{incident.serviceName} · {formatClock(incident.detectedAt)}</span>
              <span className="incident-row__badges">
                <SeverityBadge severity={incident.severity} />
                <StatusBadge status={incident.status} />
              </span>
            </button>
          ))}
          {!incidents.length ? (
            <EmptyState title="Инцидентов пока нет" description="Запустите сценарий на панели управления." />
          ) : null}
        </div>
      </aside>

      <IncidentAssistantPanel incident={selectedIncident} role={role} />

      <aside className="assistant-evidence-preview">
        <div className="panel-heading compact">
          <div>
            <span className="eyebrow">Evidence preview</span>
            <h2>Контекст ответа</h2>
            <p>Короткая сводка выбранного инцидента.</p>
          </div>
        </div>
        {selectedIncident ? (
          <>
            <div className="assistant-evidence-preview__summary">
              <strong>{selectedIncident.title}</strong>
              <p>{selectedIncident.analysis?.summary ?? selectedIncident.summary ?? "Сводка пока не сформирована."}</p>
              <div className="incident-row__badges">
                {selectedIncident.confidence ? <ConfidenceBadge confidence={selectedIncident.confidence} /> : null}
                <StatusBadge status={selectedIncident.status} />
              </div>
            </div>
            <ul>
              {(selectedIncident.analysis?.evidence ?? []).slice(0, 4).map((item) => (
                <li key={item.id}>
                  <Sparkles size={14} aria-hidden="true" />
                  {item.title}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" size="sm">
              <Link to={`/incidents/${selectedIncident.id}`}>
                Открыть инцидент
                <ExternalLink size={14} aria-hidden="true" />
              </Link>
            </Button>
          </>
        ) : (
          <p className="muted-copy">Выберите инцидент слева.</p>
        )}
      </aside>
    </div>
  );
}
