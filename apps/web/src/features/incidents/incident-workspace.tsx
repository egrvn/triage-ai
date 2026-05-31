import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { IncidentListItem } from "@triage-ai/shared";

const ROLE_KEY = "triage-ai-role";
export const ONBOARDING_HIDDEN_KEY = "triage-ai-onboarding-hidden";

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
    hint: "Дежурный инженер — первичный разбор, принятие в работу и решение по mitigation.",
    actions: ["Проверить diff развертывания", "Сравнить error-rate до и после deploy", "Открыть ключевые логи", "Подготовить rollback plan"]
  },
  escalation: {
    title: "Режим эскалации",
    hint: "Эскалация — очередь инцидентов, переданных другой команде с полным контекстом, timeline и evidence.",
    actions: ["Скопировать summary", "Показать timeline", "Показать evidence", "Указать, что уже проверено"]
  }
};

export const guideSteps = [
  ["Выберите демонстрационный сценарий", "Сценарий имитирует поток сигналов из Prometheus/ELK и создаёт инцидент для анализа."],
  ["Запустите разбор", "Система соберёт контекст, сформирует summary, гипотезу причины, confidence и список evidence."],
  ["Проверьте подтверждающие данные", "Откройте детали инцидента: логи, метрики, timeline, impact и связь с развертыванием."],
  ["Примите решение как дежурный инженер", "Возьмите инцидент в работу, закройте его, если причина понятна, или передайте на эскалацию, если нужна другая команда или confidence низкая."],
  ["Отследите очередь эскалации", "Инциденты, переданные на эскалацию, попадают в отдельный список. В нём доступен handoff summary, evidence и события передачи контекста."]
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
    critical: incidents.filter((incident) => incident.severity === "critical" && incident.status !== "closed").length,
    warning: incidents.filter((incident) => incident.severity === "warning" && incident.status !== "closed").length,
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
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(ONBOARDING_HIDDEN_KEY) !== "true";
  });

  useEffect(() => {
    window.localStorage.setItem(ROLE_KEY, role);
  }, [role]);

  useEffect(() => {
    window.localStorage.setItem(ONBOARDING_HIDDEN_KEY, String(!guideOpen));
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
