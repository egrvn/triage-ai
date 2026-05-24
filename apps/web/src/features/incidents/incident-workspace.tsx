import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { IncidentListItem } from "@triage-ai/shared";

const ROLE_KEY = "triage-ai-role";
const GUIDE_KEY = "triage-ai-guide-visible";

export type RoleMode = "on-call" | "escalation";

export type IncidentTrendPoint = {
  time: string;
  critical: number;
  warning: number;
  analyzed: number;
  lowConfidence: number;
};

export const roleCopy: Record<RoleMode, { title: string; hint: string; actions: string[] }> = {
  "on-call": {
    title: "Режим дежурного инженера",
    hint: "Сфокусируйтесь на impact, affected service и ближайшем безопасном действии.",
    actions: ["Проверить health сервиса", "Сравнить error rate до и после развертывания", "Подготовить rollback plan", "Создать эскалацию при росте impact"]
  },
  escalation: {
    title: "Режим эскалации",
    hint: "Проверьте timeline, подтверждающие данные и уверенность перед передачей контекста команде.",
    actions: ["Проверить полноту подтверждающих данных", "Сверить timeline и связь с развертыванием", "Оценить уверенность", "Передать контекст владельцу сервиса"]
  }
};

export const guideSteps = [
  ["Выберите демонстрационный сценарий", "Сценарий имитирует поток сигналов из Prometheus/ELK и создаёт инцидент для анализа."],
  ["Запустите разбор", "Нажмите кнопку запуска, чтобы система собрала контекст, сформировала сводку и гипотезу причины."],
  ["Проверьте подтверждающие данные", "Откройте детали инцидента и проверьте логи, метрики, timeline и связь с развертыванием."],
  ["Выберите действие", "Дежурный инженер может принять инцидент в работу, закрыть его или отправить на эскалацию."],
  ["Проверьте интеграции", "В разделе Интеграции показано, какие источники работают в тестовом режиме, а какие требуют production-настройки."]
];

type IncidentWorkspaceValue = {
  role: RoleMode;
  setRole: (role: RoleMode) => void;
  guideOpen: boolean;
  setGuideOpen: (open: boolean) => void;
  selectedIncidentId: string | null;
  setSelectedIncidentId: (id: string | null) => void;
  trend: IncidentTrendPoint[];
  appendTrend: (incidents: IncidentListItem[]) => void;
  resetTrend: () => void;
};

const IncidentWorkspaceContext = createContext<IncidentWorkspaceValue | null>(null);

export function buildTrendPoint(incidents: IncidentListItem[], label?: string): IncidentTrendPoint {
  return {
    time: label ?? new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
    critical: incidents.filter((incident) => incident.severity === "critical" && incident.status !== "resolved").length,
    warning: incidents.filter((incident) => incident.severity === "warning" && incident.status !== "resolved").length,
    analyzed: incidents.filter((incident) => Boolean(incident.confidence)).length,
    lowConfidence: incidents.filter((incident) => incident.confidence === "low").length
  };
}

export function IncidentWorkspaceProvider({ children }: { children: ReactNode }) {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [trend, setTrend] = useState<IncidentTrendPoint[]>([]);
  const [role, setRole] = useState<RoleMode>(() => {
    if (typeof window === "undefined") return "on-call";
    return window.localStorage.getItem(ROLE_KEY) === "escalation" ? "escalation" : "on-call";
  });
  const [guideOpen, setGuideOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(GUIDE_KEY) === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(ROLE_KEY, role);
  }, [role]);

  useEffect(() => {
    window.localStorage.setItem(GUIDE_KEY, String(guideOpen));
  }, [guideOpen]);

  const value = useMemo<IncidentWorkspaceValue>(() => ({
    role,
    setRole,
    guideOpen,
    setGuideOpen,
    selectedIncidentId,
    setSelectedIncidentId,
    trend,
    appendTrend: (incidents) => setTrend((current) => [...current.slice(-5), buildTrendPoint(incidents)]),
    resetTrend: () => setTrend([])
  }), [guideOpen, role, selectedIncidentId, trend]);

  return <IncidentWorkspaceContext.Provider value={value}>{children}</IncidentWorkspaceContext.Provider>;
}

export function useIncidentWorkspace() {
  const context = useContext(IncidentWorkspaceContext);
  if (!context) {
    throw new Error("useIncidentWorkspace must be used inside IncidentWorkspaceProvider");
  }
  return context;
}
