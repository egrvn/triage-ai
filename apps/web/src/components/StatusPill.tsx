import type { Confidence, Severity } from "@triage-ai/shared";
import type { ReactNode } from "react";

type StatusPillProps = {
  tone: Severity | Confidence | "active" | "acknowledged" | "escalated" | "resolved" | "mock" | "adapter" | "disabled" | "healthy" | "needs_config" | "running" | "error";
  children: ReactNode;
};

export function StatusPill({ tone, children }: StatusPillProps) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}
