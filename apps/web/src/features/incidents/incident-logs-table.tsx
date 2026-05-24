import type { IncidentDetail, LogEvent } from "@triage-ai/shared";
import { ChevronDown, Clock3, FileCode2 } from "lucide-react";
import { Fragment } from "react";
import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/lib/labels";

function levelLabel(level: LogEvent["level"]) {
  if (level === "error") return "ошибка";
  if (level === "warn") return "предупреждение";
  if (level === "info") return "инфо";
  return "debug";
}

function levelTone(level: LogEvent["level"]) {
  if (level === "error") return "error";
  if (level === "warn") return "warning";
  if (level === "info") return "info";
  return "adapter";
}

function extractHttpStatus(message: string) {
  const match = message.match(/\b([1-5]\d{2})\b/);
  return match?.[1] ?? "—";
}

export function IncidentLogsTable({
  incident,
  logs
}: {
  incident?: IncidentDetail;
  logs: LogEvent[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(logs[0]?.id ?? null);

  if (!incident) {
    return (
      <section className="ops-panel logs-table-panel">
        <EmptyState title="Логи недоступны" description="Выберите инцидент, чтобы увидеть связанные логи и payload." />
      </section>
    );
  }

  return (
    <section className="ops-panel logs-table-panel">
      <div className="panel-heading">
        <div>
          <h2>Логи и ошибки</h2>
          <p>Таблица показывает события выбранного инцидента и раскрывает payload без горизонтального скролла страницы.</p>
        </div>
        <StatusPill tone={incident.status}>{incident.serviceName}</StatusPill>
      </div>

      {logs.length ? (
        <div className="logs-table-wrap">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Уровень</th>
                <th>Время</th>
                <th>Сервис</th>
                <th>Статус</th>
                <th>Сообщение</th>
                <th><span className="sr-only">Действие</span></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const expanded = expandedId === log.id;
                return (
                  <Fragment key={log.id}>
                    <tr className={expanded ? "expanded" : ""}>
                      <td><StatusPill tone={levelTone(log.level)}>{levelLabel(log.level)}</StatusPill></td>
                      <td><span className="log-time"><Clock3 size={13} aria-hidden="true" />{formatClock(log.timestamp)}</span></td>
                      <td><code>{log.serviceName}</code></td>
                      <td><code>{extractHttpStatus(log.message)}</code></td>
                      <td><span className="log-message">{log.message}</span></td>
                      <td>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={expanded ? "Свернуть лог" : "Раскрыть лог"}
                          onClick={() => setExpandedId(expanded ? null : log.id)}
                        >
                          <ChevronDown className={expanded ? "rotate-180" : ""} size={16} aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="logs-table__details-row">
                        <td colSpan={6}>
                          <div className="log-details">
                            <article>
                              <strong>Связанный инцидент</strong>
                              <p>{incident.title}</p>
                            </article>
                            <article>
                              <strong>Теги</strong>
                              <div className="log-tags">
                                <span>{log.source}</span>
                                <span>{log.traceId ?? "trace отсутствует"}</span>
                                <span>{incident.severity}</span>
                              </div>
                            </article>
                            <article>
                              <strong>Рекомендация</strong>
                              <p>{incident.analysis?.nextStep ?? "Проверьте логи, метрики и timeline вручную."}</p>
                            </article>
                            <article className="log-payload">
                              <strong><FileCode2 size={14} aria-hidden="true" /> Payload</strong>
                              <pre><code>{JSON.stringify({
                                id: log.id,
                                level: log.level,
                                serviceName: log.serviceName,
                                timestamp: log.timestamp,
                                traceId: log.traceId,
                                message: log.message
                              }, null, 2)}</code></pre>
                            </article>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="По выбранным фильтрам ничего не найдено"
          description="Сбросьте фильтры или выберите другой уровень логов."
        />
      )}
    </section>
  );
}
