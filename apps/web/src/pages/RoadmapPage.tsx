import {
  Activity,
  Bot,
  CheckCircle2,
  DatabaseZap,
  GitBranch,
  KeyRound,
  LineChart,
  Rocket,
  ShieldCheck
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";

const roadmapSections = [
  {
    title: "Реальные источники данных",
    status: "Следующий шаг",
    icon: DatabaseZap,
    items: ["Адаптер Prometheus", "Логи ELK/OpenSearch", "События deploy", "Прием через Webhook/API", "Валидация payload"]
  },
  {
    title: "LLM providers",
    status: "Production",
    icon: Bot,
    items: ["Mock provider → production provider", "YandexGPT", "GigaChat", "OpenAI", "Custom OpenAI-compatible endpoint", "Prompt templates", "Оценка качества ответов"]
  },
  {
    title: "Безопасность и доступы",
    status: "Production",
    icon: KeyRound,
    items: ["Production-аутентификация", "RBAC", "SSO", "Audit log", "Secrets manager", "Маскирование данных"]
  },
  {
    title: "Процесс инцидента",
    status: "В MVP",
    icon: GitBranch,
    items: ["События эскалации", "Handoff summary", "Черновик postmortem", "Владелец инцидента", "Комментарии и activity feed"]
  },
  {
    title: "Наблюдаемость и качество",
    status: "Следующий шаг",
    icon: Activity,
    items: ["Monitoring Triage AI", "Latency и надежность", "Feedback loop", "Метрики качества модели"]
  },
  {
    title: "Проверка пилота",
    status: "Следующий шаг",
    icon: LineChart,
    items: ["Time to Hypothesis", "RCA Coverage", "Adoption", "NPS/feedback", "Сравнение с baseline"]
  },
  {
    title: "Готовность к production",
    status: "Production",
    icon: Rocket,
    items: ["Deployment", "Environment configs", "Logging", "Backup/recovery", "Нагрузочное тестирование"]
  }
];

function statusTone(status: string) {
  if (status === "В MVP") return "healthy";
  if (status === "Следующий шаг") return "adapter";
  return "mock";
}

export function RoadmapPage() {
  return (
    <div className="roadmap-page">
      <section className="roadmap-hero ops-panel">
        <div className="roadmap-hero__icon" aria-hidden="true">
          <ShieldCheck size={28} />
        </div>
        <div>
          <span className="eyebrow">Production-контур</span>
          <h2>Путь к production-ready версии</h2>
          <p>
            План развития показывает, какие части уже покрыты тестовым контуром, а какие нужны для production-использования
            Triage AI в реальном DevOps/SRE-процессе.
          </p>
        </div>
      </section>

      <section className="roadmap-timeline" aria-label="Roadmap продукта">
        {roadmapSections.map((section, index) => {
          const Icon = section.icon;
          return (
            <article key={section.title} className="roadmap-card">
              <div className="roadmap-card__number">{String(index + 1).padStart(2, "0")}</div>
              <div className="roadmap-card__body">
                <div className="roadmap-card__header">
                  <div className="roadmap-card__icon" aria-hidden="true">
                    <Icon size={22} />
                  </div>
                  <div>
                    <h3>{section.title}</h3>
                    <StatusPill tone={statusTone(section.status)}>{section.status}</StatusPill>
                  </div>
                </div>
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>
                      <CheckCircle2 size={15} aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </section>

      <section className="roadmap-actions ops-panel">
        <div>
          <h2>Следующий практический шаг</h2>
          <p>Для проверки production-контура начните с источников сигналов и провайдеров AI, затем закрепите security boundary.</p>
        </div>
        <div className="incident-actions">
          <Button asChild variant="outline">
            <Link to="/settings">Вернуться в настройки</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/integrations">Открыть интеграции</Link>
          </Button>
          <Button asChild>
            <Link to="/incidents">Открыть инциденты</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
