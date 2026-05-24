import type { Confidence, IncidentListItem, IncidentStatus, LogEvent, Severity } from "@triage-ai/shared";
import { Check, Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type IncidentTimeRange = "hour" | "today" | "24h" | "all";
export type IncidentLevelFilter = "all" | "error" | "warn" | "info";

export type IncidentFilterState = {
  query: string;
  level: IncidentLevelFilter;
  service: string;
  status: IncidentStatus | "all";
  severity: Severity | "all";
  confidence: Confidence | "all";
  timeRange: IncidentTimeRange;
};

const defaultFilters: IncidentFilterState = {
  query: "",
  level: "all",
  service: "all",
  status: "all",
  severity: "all",
  confidence: "all",
  timeRange: "all"
};

const levelOptions: Array<[IncidentLevelFilter, string]> = [
  ["all", "Все"],
  ["error", "Ошибки"],
  ["warn", "Предупреждения"],
  ["info", "Инфо"]
];

const statusOptions: Array<[IncidentStatus | "all", string]> = [
  ["all", "Все"],
  ["active", "Активен"],
  ["acknowledged", "В работе"],
  ["escalated", "Эскалирован"],
  ["resolved", "Закрыт"]
];

const severityOptions: Array<[Severity | "all", string]> = [
  ["all", "Все"],
  ["critical", "Критичный"],
  ["warning", "Средний"],
  ["info", "Низкий"]
];

const confidenceOptions: Array<[Confidence | "all", string]> = [
  ["all", "Все"],
  ["high", "Высокая уверенность"],
  ["medium", "Средняя уверенность"],
  ["low", "Низкая уверенность"]
];

const timeOptions: Array<[IncidentTimeRange, string]> = [
  ["hour", "За последний час"],
  ["today", "Сегодня"],
  ["24h", "Последние 24 часа"],
  ["all", "Все"]
];

export function createDefaultIncidentFilters(): IncidentFilterState {
  return { ...defaultFilters };
}

function isInsideRange(timestamp: string, range: IncidentTimeRange) {
  if (range === "all") return true;
  const date = new Date(timestamp);
  const now = new Date();
  if (Number.isNaN(date.getTime())) return true;
  if (range === "hour") return now.getTime() - date.getTime() <= 60 * 60 * 1000;
  if (range === "24h") return now.getTime() - date.getTime() <= 24 * 60 * 60 * 1000;
  return date.toDateString() === now.toDateString();
}

export function matchesIncidentFilters(incident: IncidentListItem, filters: IncidentFilterState) {
  const query = filters.query.trim().toLowerCase();
  const matchesQuery = !query || [
    incident.title,
    incident.serviceName,
    incident.status,
    incident.severity,
    incident.confidence ?? ""
  ].some((value) => value.toLowerCase().includes(query));

  return matchesQuery
    && (filters.service === "all" || incident.serviceName === filters.service)
    && (filters.status === "all" || incident.status === filters.status)
    && (filters.severity === "all" || incident.severity === filters.severity)
    && (filters.confidence === "all" || incident.confidence === filters.confidence)
    && isInsideRange(incident.detectedAt, filters.timeRange);
}

export function matchesLogFilters(log: LogEvent, filters: IncidentFilterState) {
  const query = filters.query.trim().toLowerCase();
  const matchesQuery = !query || [
    log.message,
    log.serviceName,
    log.level,
    log.source,
    log.traceId ?? ""
  ].some((value) => value.toLowerCase().includes(query));

  return matchesQuery
    && (filters.service === "all" || log.serviceName === filters.service)
    && (filters.level === "all" || log.level === filters.level || (filters.level === "warn" && log.level === "warn"))
    && isInsideRange(log.timestamp, filters.timeRange);
}

function isDefault(filters: IncidentFilterState) {
  return Object.entries(defaultFilters).every(([key, value]) => filters[key as keyof IncidentFilterState] === value);
}

function FilterChip<T extends string>({
  active,
  value,
  label,
  onSelect
}: {
  active: boolean;
  value: T;
  label: string;
  onSelect: (value: T) => void;
}) {
  return (
    <button type="button" className={active ? "filter-chip active" : "filter-chip"} onClick={() => onSelect(value)}>
      {active ? <Check size={13} aria-hidden="true" /> : null}
      {label}
    </button>
  );
}

export function IncidentFilters({
  filters,
  onChange,
  services,
  resultCount
}: {
  filters: IncidentFilterState;
  onChange: (filters: IncidentFilterState) => void;
  services: string[];
  resultCount: number;
}) {
  const setFilter = <K extends keyof IncidentFilterState>(key: K, value: IncidentFilterState[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <section className="incident-filter-panel" aria-label="Фильтры инцидентов и логов">
      <div className="incident-filter-panel__header">
        <div>
          <span className="eyebrow">Фильтры</span>
          <h2>Отбор по ошибкам, сервисам и времени</h2>
          <p>Фильтры применяются к списку инцидентов и логам выбранного инцидента.</p>
        </div>
        <div className="incident-filter-panel__count">
          <Filter size={15} aria-hidden="true" />
          Найдено: {resultCount}
        </div>
      </div>

      <label className="incident-filter-search">
        <Search size={16} aria-hidden="true" />
        <span className="sr-only">Фильтр по логам</span>
        <input
          value={filters.query}
          onChange={(event) => setFilter("query", event.target.value)}
          placeholder="Фильтр по логам, сервису или сигналу..."
        />
      </label>

      <div className="filter-grid">
        <div className="filter-group">
          <strong>Уровень логов</strong>
          <div>{levelOptions.map(([value, label]) => <FilterChip key={value} value={value} label={label} active={filters.level === value} onSelect={(next) => setFilter("level", next)} />)}</div>
        </div>
        <div className="filter-group">
          <strong>Сервис</strong>
          <div>
            <FilterChip value="all" label="Все" active={filters.service === "all"} onSelect={(next) => setFilter("service", next)} />
            {services.map((service) => (
              <FilterChip key={service} value={service} label={service} active={filters.service === service} onSelect={(next) => setFilter("service", next)} />
            ))}
          </div>
        </div>
        <div className="filter-group">
          <strong>Статус инцидента</strong>
          <div>{statusOptions.map(([value, label]) => <FilterChip key={value} value={value} label={label} active={filters.status === value} onSelect={(next) => setFilter("status", next)} />)}</div>
        </div>
        <div className="filter-group">
          <strong>Severity</strong>
          <div>{severityOptions.map(([value, label]) => <FilterChip key={value} value={value} label={label} active={filters.severity === value} onSelect={(next) => setFilter("severity", next)} />)}</div>
        </div>
        <div className="filter-group">
          <strong>Уверенность</strong>
          <div>{confidenceOptions.map(([value, label]) => <FilterChip key={value} value={value} label={label} active={filters.confidence === value} onSelect={(next) => setFilter("confidence", next)} />)}</div>
        </div>
        <div className="filter-group">
          <strong>Время</strong>
          <div>{timeOptions.map(([value, label]) => <FilterChip key={value} value={value} label={label} active={filters.timeRange === value} onSelect={(next) => setFilter("timeRange", next)} />)}</div>
        </div>
      </div>

      {!isDefault(filters) ? (
        <div className="active-filters">
          <span>Активные фильтры применены</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(createDefaultIncidentFilters())}>
            <X size={14} aria-hidden="true" />
            Сбросить фильтры
          </Button>
        </div>
      ) : null}
    </section>
  );
}
