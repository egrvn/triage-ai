import type { Confidence, Severity } from "@coursework/shared";
import type { ReactNode } from "react";

type StatusPillProps = {
  tone: Severity | Confidence | "active" | "resolved" | "mock" | "adapter" | "disabled";
  children: ReactNode;
};

export function StatusPill({ tone, children }: StatusPillProps) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}
