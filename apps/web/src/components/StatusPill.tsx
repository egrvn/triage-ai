import type { Confidence, Severity } from "@coursework/shared";
import type { ReactNode } from "react";

type StatusPillProps = {
  tone: Severity | Confidence | "active" | "acknowledged" | "escalated" | "resolved" | "mock" | "adapter" | "disabled" | "healthy" | "needs_config" | "running";
  children: ReactNode;
};

export function StatusPill({ tone, children }: StatusPillProps) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}
