import { Activity } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
};

export function EmptyState({
  title = "Нет активных инцидентов",
  description = "Запустите демонстрационный сценарий, чтобы увидеть сводку, гипотезу причины и подтверждающие данные.",
  children
}: EmptyStateProps) {
  return (
    <section className="empty-state">
      <Activity size={28} aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
        {children ? <div className="empty-state__actions">{children}</div> : null}
      </div>
    </section>
  );
}
