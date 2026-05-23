import { Activity } from "lucide-react";

type EmptyStateProps = {
  title?: string;
  description?: string;
};

export function EmptyState({
  title = "Нет активных инцидентов",
  description = "Запустите demo сценарий, чтобы увидеть AI-сводку, hypothesis и evidence."
}: EmptyStateProps) {
  return (
    <section className="empty-state">
      <Activity size={28} />
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </section>
  );
}
