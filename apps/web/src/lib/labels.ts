import type { Confidence, IncidentStatus, Severity } from "@triage-ai/shared";

export function formatClock(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(value));
}

export function formatDateTime(value?: string) {
  if (!value) {
    return "не проверялась";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function confidenceLabel(confidence?: Confidence) {
  if (confidence === "high") return "Высокая уверенность";
  if (confidence === "medium") return "Средняя уверенность";
  if (confidence === "low") return "Низкая уверенность";
  return "Ожидает анализа";
}

export function statusLabel(status: IncidentStatus) {
  if (status === "active") return "Активен";
  if (status === "acknowledged") return "В работе";
  if (status === "escalated") return "Эскалирован";
  return "Закрыт";
}

export function severityLabel(severity: Severity) {
  if (severity === "critical") return "Критичный";
  if (severity === "warning") return "Предупреждение";
  return "Информация";
}
