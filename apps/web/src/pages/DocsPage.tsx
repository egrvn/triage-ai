import { BookOpenText, ExternalLink, HelpCircle, Layers, ListChecks, Search } from "lucide-react";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { AnimatedGlowingSearchBar } from "@/components/ui/animated-glowing-search-bar";

type DocsSection = {
  id: string;
  title: string;
  icon: ComponentType<{ size?: number }>;
  body: ReactNode;
  keywords: string[];
};

const scenarioDocs = [
  {
    title: "Release regression: HTTP 5xx spike",
    service: "payment-svc",
    signals: "HTTP 5xx spike, correlated Logs, Deployment feat/retry-logic-v2",
    summary: "payment-svc показывает рост 5xx после нового Deployment.",
    hypothesis: "Вероятная regression в retry policy последнего Release.",
    action: "Проверить diff, сравнить error rate до/после Deployment, выполнить rollback при подтверждении."
  },
  {
    title: "Latency degradation under load",
    service: "catalog-svc",
    signals: "p95 latency, CPU pressure, queue depth",
    summary: "catalog-svc деградирует под пиковым traffic без явного release trigger.",
    hypothesis: "Нагрузка на search-index queue и CPU saturation.",
    action: "Проверить capacity, queue workers, hot endpoints и autoscaling."
  },
  {
    title: "External API timeout",
    service: "checkout-svc",
    signals: "external_api_error_rate, timeout Logs, circuit breaker",
    summary: "checkout деградирует из-за timeout внешней loyalty API.",
    hypothesis: "Dependency outage или network degradation у внешнего API.",
    action: "Включить fallback, проверить circuit breaker и связаться с владельцем dependency."
  },
  {
    title: "Sparse signal: low confidence fallback",
    service: "profile-svc",
    signals: "один Alert, минимум Logs/Metrics, нет Deployment context",
    summary: "Signal неполный, AI не делает уверенный вывод.",
    hypothesis: "Low confidence fallback: требуется ручная проверка.",
    action: "Собрать дополнительные Logs/Metrics или отправить incident в escalation."
  }
];

const sections: DocsSection[] = [
  {
    id: "overview",
    title: "Обзор",
    icon: BookOpenText,
    keywords: ["overview", "triage", "incident response", "summary", "hypothesis"],
    body: (
      <p>
        Triage AI — это MVP-консоль для incident response. Она помогает on-call и escalation-командам быстрее собрать
        context, получить auto-summary, сформировать root-cause hypothesis и проверить evidence.
      </p>
    )
  },
  {
    id: "quick-start",
    title: "Быстрый старт",
    icon: ListChecks,
    keywords: ["quick start", "login", "dashboard", "scenario", "play"],
    body: (
      <ol>
        <li>Войдите в личный кабинет.</li>
        <li>Откройте Dashboard.</li>
        <li>Выберите demo scenario и нажмите play.</li>
        <li>Откройте созданный incident.</li>
        <li>Проверьте AI summary, evidence и recommended next steps.</li>
        <li>Примите incident в работу, эскалируйте или закройте.</li>
      </ol>
    )
  },
  {
    id: "triage-flow",
    title: "Как работает triage",
    icon: Layers,
    keywords: ["prometheus", "elk", "correlation", "ai", "confidence", "fallback"],
    body: (
      <div className="docs-flow">
        {[
          ["Signals", "Prometheus/ELK/mock adapters отдают Metrics, Logs и Alerts."],
          ["Normalization", "Система приводит события к единому формату."],
          ["Correlation engine", "Logs, Metrics и Deployment context связываются по service и timeline."],
          ["AI analysis", "Provider формирует summary, hypothesis и confidence score."],
          ["Handoff", "On-call или escalation получают готовый context и next steps."]
        ].map(([step, text]) => (
          <article key={step}>
            <strong>{step}</strong>
            <p>{text}</p>
          </article>
        ))}
      </div>
    )
  },
  {
    id: "demo-scenarios",
    title: "Demo scenarios",
    icon: Search,
    keywords: ["release regression", "latency", "external api", "low confidence", "scenario"],
    body: (
      <div className="docs-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Affected service</th>
              <th>Input signals</th>
              <th>Expected summary</th>
              <th>Recommended action</th>
            </tr>
          </thead>
          <tbody>
            {scenarioDocs.map((scenario) => (
              <tr key={scenario.title}>
                <td><strong>{scenario.title}</strong><br /><small>{scenario.hypothesis}</small></td>
                <td>{scenario.service}</td>
                <td>{scenario.signals}</td>
                <td>{scenario.summary}</td>
                <td>{scenario.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
  {
    id: "integrations",
    title: "Интеграции",
    icon: ExternalLink,
    keywords: ["prometheus", "elk", "telegram", "slack", "email", "provider", "secrets"],
    body: (
      <div className="docs-card-grid">
        {[
          ["Prometheus metrics", "Источник Metrics и SLO-сигналов.", "mock / healthy", "endpoint, read-only Token, alert rules"],
          ["ELK logs", "Источник Logs, trace id и error context.", "mock / healthy", "ELK endpoint, index pattern, service account"],
          ["Telegram alerts", "On-call уведомления и deep links.", "mock / healthy", "bot Token, chat id, notification policy"],
          ["Slack alerts", "Командные incident notifications.", "disabled", "Slack app, Webhook URL, workspace approval"],
          ["Email alerts", "Fallback для email notifications.", "disabled", "SMTP endpoint, sender identity, recipient groups"],
          ["AI analysis provider", "Auto-summary, hypothesis и confidence.", "mock / healthy", "API key, policy, prompt/evaluation controls"]
        ].map(([name, purpose, mode, requirements]) => (
          <article key={name} className="docs-mini-card">
            <strong>{name}</strong>
            <p>{purpose}</p>
            <small>Режим: {mode}</small>
            <code>{requirements}</code>
          </article>
        ))}
      </div>
    )
  },
  {
    id: "roles",
    title: "Роли",
    icon: HelpCircle,
    keywords: ["on-call", "escalation", "role"],
    body: (
      <div className="docs-card-grid two">
        <article className="docs-mini-card">
          <strong>On-call</strong>
          <p>Фокус на impact, affected service и ближайшем безопасном действии: принять incident, проверить service, подготовить rollback или escalation.</p>
        </article>
        <article className="docs-mini-card">
          <strong>Escalation</strong>
          <p>Фокус на evidence, timeline, confidence и качестве handoff context для профильной команды.</p>
        </article>
      </div>
    )
  },
  {
    id: "statuses",
    title: "Статусы и метрики",
    icon: ListChecks,
    keywords: ["critical", "active", "running", "resolved", "escalated", "low confidence"],
    body: (
      <dl className="docs-definitions">
        <div><dt>Critical active</dt><dd>Количество critical incidents, которые еще не resolved.</dd></div>
        <div><dt>AI analyzed</dt><dd>Количество incidents, где сформированы AI summary и hypothesis.</dd></div>
        <div><dt>Low confidence</dt><dd>Случаи, где signal неполный и hypothesis требует ручной проверки.</dd></div>
        <div><dt>Running / Resolved / Escalated</dt><dd>Состояния жизненного цикла incident в MVP.</dd></div>
      </dl>
    )
  },
  {
    id: "faq",
    title: "FAQ",
    icon: HelpCircle,
    keywords: ["faq", "mock", "production", "secrets", "ai"],
    body: (
      <div className="faq-list">
        {[
          ["Почему данные mock?", "MVP должен быть runnable без secrets и реальных customer data."],
          ["Можно ли подключить реальные Prometheus/ELK?", "Да, через production adapters, endpoint allowlist и secrets management."],
          ["Что означает low confidence?", "Система не уверена в hypothesis, потому что signal неполный или evidence слабая."],
          ["Заменяет ли AI инженера?", "Нет. AI ускоряет сбор context, но решение остается за on-call или escalation."],
          ["Где хранятся secrets?", "В MVP secrets не хранятся. Для production нужен внешний secrets management."],
          ["Как перейти от MVP к production?", "Добавить real data sources, auth, RBAC, observability, audit log и deployment pipeline."]
        ].map(([question, answer]) => (
          <article key={question}>
            <strong>{question}</strong>
            <p>{answer}</p>
          </article>
        ))}
      </div>
    )
  }
];

function sectionMatches(section: DocsSection, query: string) {
  if (!query) return true;
  const haystack = [section.title, ...section.keywords].join(" ").toLowerCase();
  return haystack.includes(query);
}

export function DocsPage() {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filteredSections = useMemo(() => sections.filter((section) => sectionMatches(section, query)), [query]);

  return (
    <div className="docs-page">
      <section className="dashboard-toolbar">
        <AnimatedGlowingSearchBar
          value={search}
          onChange={setSearch}
          onSubmit={() => {
            const first = filteredSections[0];
            if (first) document.getElementById(first.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          placeholder="Искать разделы docs, scenario, confidence..."
        />
      </section>

      <div className="mock-callout wide">
        MVP использует mock adapters. Для production потребуется подключение real data sources и secrets management.
      </div>

      <div className="docs-layout">
        <aside className="docs-nav">
          <strong>Разделы</strong>
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>{section.title}</a>
          ))}
        </aside>

        <main className="docs-content">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            return (
              <section key={section.id} id={section.id} className="docs-section">
                <div className="docs-section__heading">
                  <Icon size={19} />
                  <h2>{section.title}</h2>
                </div>
                {section.body}
              </section>
            );
          })}
          {!filteredSections.length ? (
            <section className="docs-section">
              <h2>Ничего не найдено</h2>
              <p>Измените запрос или фильтры и попробуйте снова.</p>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
