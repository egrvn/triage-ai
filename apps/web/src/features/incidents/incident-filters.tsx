import type { Confidence, IncidentListItem, IncidentStatus, LogEvent, Severity } from "@triage-ai/shared";
import { Filter, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type LogLevelFilter = "all" | "error" | "warn" | "info";
export type TimeframeFilter = "hour" | "today" | "day" | "all";

export type IncidentFilterState = {
  query: string;
  level: LogLevelFilter;
  service: string;
  status: IncidentStatus | "all";
  severity: Severity | "all";
  confidence: Confidence | "all";
  timeframe: TimeframeFilter;
};

const defaultFilters: IncidentFilterState = {
  query: "",
  level: "all",
  service: "all",
  status: "all",
  severity: "all",
  confidence: "all",
  timeframe: "all"
};

const levelOptions: Array<[LogLevelFilter, string]> = [
  ["all", "Все"],
  ["error", "Ошибки"],
  ["warn", "Предупреждения"],
  ["info", "Инфо"]
];

const statusOptions: Array<[IncidentStatus | "all", string]> = [
  ["all", "Все"],
  ["new", "Новый"],
  ["in_progress", "В работе"],
  ["escalated", "На эскалации"],
  ["closed", "Закрыт"]
];

const severityOptions: Array<[Severity | "all", string]> = [
  ["all", "Все"],
  ["critical", "Критичный"],
  ["warning", "Средний"],
  ["info", "Низкий"]
];

const confidenceOptions: Array<[Confidence | "all", string]> = [
  ["all", "Все"],
  ["high", "Высокая"],
  ["medium", "Средняя"],
  ["low", "Низкая"]
];

const timeframeOptions: Array<[TimeframeFilter, string]> = [
  ["hour", "Последний час"],
  ["today", "Сегодня"],
  ["day", "24 часа"],
  ["all", "Все"]
];

function getOptionLabel<T extends string>(options: Array<[T, string]>, value: T) {
  return options.find(([optionValue]) => optionValue === value)?.[1] ?? value;
}

function isInTimeframe(timestamp: string, timeframe: TimeframeFilter) {
  if (timeframe === "all") return true;
  const date = new Date(timestamp);
  const now = new Date();
  if (Number.isNaN(date.getTime())) return true;

  if (timeframe === "hour") {
    return now.getTime() - date.getTime() <= 60 * 60 * 1000;
  }
  if (timeframe === "day") {
    return now.getTime() - date.getTime() <= 24 * 60 * 60 * 1000;
  }
  return date.toDateString() === now.toDateString();
}

export function createDefaultIncidentFilters() {
  return { ...defaultFilters };
}

export function matchesIncidentFilters(incident: IncidentListItem, filters: IncidentFilterState) {
  const query = filters.query.trim().toLowerCase();
  const matchesQuery = !query || [
    incident.title,
    incident.serviceName,
    incident.status,
    incident.severity,
    incident.confidence ?? "",
    incident.summary ?? "",
    incident.hypothesis ?? ""
  ].some((value) => value.toLowerCase().includes(query));

  return matchesQuery
    && (filters.service === "all" || incident.serviceName === filters.service)
    && (filters.status === "all" || incident.status === filters.status)
    && (filters.severity === "all" || incident.severity === filters.severity)
    && (filters.confidence === "all" || incident.confidence === filters.confidence)
    && isInTimeframe(incident.detectedAt, filters.timeframe);
}

export function matchesLogFilters(log: LogEvent, filters: IncidentFilterState) {
  const query = filters.query.trim().toLowerCase();
  const matchesQuery = !query || [log.message, log.serviceName, log.level, log.traceId ?? ""]
    .some((value) => value.toLowerCase().includes(query));

  return matchesQuery
    && (filters.level === "all" || log.level === filters.level)
    && (filters.service === "all" || log.serviceName === filters.service)
    && isInTimeframe(log.timestamp, filters.timeframe);
}

type FilterSelectProps<T extends string> = {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
};

function FilterSelect<T extends string>({ label, value, options, onChange }: FilterSelectProps<T>) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

export function IncidentFilters({
  filters,
  services,
  resultCount,
  onChange
}: {
  filters: IncidentFilterState;
  services: string[];
  resultCount: number;
  onChange: (filters: IncidentFilterState) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLElement | null>(null);
  const update = (patch: Partial<IncidentFilterState>) => onChange({ ...filters, ...patch });
  const reset = () => onChange(createDefaultIncidentFilters());
  const activeFilters = [
    filters.query ? ["query", `Запрос: ${filters.query}`] : null,
    filters.level !== "all" ? ["level", `Уровень: ${getOptionLabel(levelOptions, filters.level)}`] : null,
    filters.service !== "all" ? ["service", `Сервис: ${filters.service}`] : null,
    filters.status !== "all" ? ["status", `Статус: ${getOptionLabel(statusOptions, filters.status)}`] : null,
    filters.severity !== "all" ? ["severity", `Критичность: ${getOptionLabel(severityOptions, filters.severity)}`] : null,
    filters.confidence !== "all" ? ["confidence", `Уверенность: ${getOptionLabel(confidenceOptions, filters.confidence)}`] : null,
    filters.timeframe !== "all" ? ["timeframe", `Период: ${getOptionLabel(timeframeOptions, filters.timeframe)}`] : null
  ].filter(Boolean) as Array<[keyof IncidentFilterState, string]>;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <section ref={rootRef} className={`incident-filter-panel ${open ? "is-open" : ""}`} aria-label="Фильтры инцидентов и логов">
      <div className="incident-filter-panel__header">
        <div>
          <span className="eyebrow">Фильтры</span>
          <h2>Расширенный отбор</h2>
          <p>Настройте выборку по сервису, уровню логов, статусу и периоду.</p>
        </div>
        <div className="incident-filter-panel__actions">
          <span className="filter-count">Найдено: {resultCount}</span>
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            <X size={14} aria-hidden="true" />
            Сбросить
          </Button>
        </div>
      </div>

      <div className="filter-search-row">
        <label className="filter-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Фильтр по логам</span>
          <input
            value={filters.query}
            onChange={(event) => update({ query: event.target.value })}
            placeholder="Искать по логам, сервису или сигналу..."
          />
        </label>
        <Button
          type="button"
          className="filter-toggle-button"
          aria-label="Открыть фильтры"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          <Filter size={15} aria-hidden="true" />
          Фильтры
        </Button>
      </div>

      {activeFilters.length ? (
        <div className="active-filter-row">
          <Filter size={14} aria-hidden="true" />
          {activeFilters.map(([key, label]) => (
            <button key={key} type="button" onClick={() => update({ [key]: defaultFilters[key] } as Partial<IncidentFilterState>)}>
              {label}
              <X size={13} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}

      <div id={panelId} className="incident-filter-panel__advanced" hidden={!open}>
        <div className="filter-grid">
          <FilterSelect label="Уровень логов" value={filters.level} options={levelOptions} onChange={(level) => update({ level })} />
          <FilterSelect
            label="Сервис"
            value={filters.service}
            options={[["all", "Все"], ...services.map((service) => [service, service] as [string, string])]}
            onChange={(service) => update({ service })}
          />
          <FilterSelect label="Статус" value={filters.status} options={statusOptions} onChange={(status) => update({ status })} />
          <FilterSelect label="Критичность" value={filters.severity} options={severityOptions} onChange={(severity) => update({ severity })} />
          <FilterSelect label="Уверенность" value={filters.confidence} options={confidenceOptions} onChange={(confidence) => update({ confidence })} />
          <FilterSelect label="Период" value={filters.timeframe} options={timeframeOptions} onChange={(timeframe) => update({ timeframe })} />
        </div>
        <div className="incident-filter-panel__footer">
          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            Применить
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            Сбросить
          </Button>
        </div>
      </div>
    </section>
  );
}
