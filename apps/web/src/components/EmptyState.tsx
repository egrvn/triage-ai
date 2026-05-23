import { Activity } from "lucide-react";

export function EmptyState() {
  return (
    <section className="empty-state">
      <Activity size={28} />
      <div>
        <h2>Нет активных инцидентов</h2>
        <p>Запусти mock-сценарий, чтобы увидеть AI-сводку, гипотезу и доказательства.</p>
      </div>
    </section>
  );
}
