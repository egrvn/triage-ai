import type { Confidence, IncidentStatus, Severity } from "@triage-ai/shared";
import type { ReactNode } from "react";
import { confidenceLabel, severityLabel, statusLabel } from "@/lib/labels";

type StatusPillProps = {
  tone: Severity | Confidence | "new" | "in_progress" | "escalated" | "closed" | "mock" | "adapter" | "disabled" | "healthy" | "needs_config" | "running";
  children: ReactNode;
};

export function StatusPill({ tone, children }: StatusPillProps) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <StatusPill tone={severity}>{severityLabel(severity)}</StatusPill>;
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <StatusPill tone={status}>{statusLabel(status)}</StatusPill>;
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return <StatusPill tone={confidence}>{confidenceLabel(confidence)}</StatusPill>;
}
