import {
  BookOpenText,
  CircleHelp,
  Bot,
  FlaskConical,
  ListChecks,
  PlaySquare,
  Plug,
  SearchCheck,
  ShieldCheck,
  UsersRound,
  Workflow,
  ChartNoAxesCombined
} from "lucide-react";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatedGlowingSearchBar } from "@/components/ui/animated-glowing-search-bar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { pilotMetrics } from "@/lib/pilot-metrics";
import { cn } from "@/lib/utils";

type DocsSection = {
  id: string;
  title: string;
  icon: ComponentType<{ size?: number }>;
  body: ReactNode;
  keywords: string[];
};

const scenarioDocs = [
  {
    title: "Регрессия после релиза: всплеск HTTP 5xx",
    service: "payment-svc",
    signals: "HTTP 5xx, логи ошибок, развертывание feat/retry-logic-v2",
    summary: "payment-svc показывает рост HTTP 5xx после нового развертывания.",
    hypothesis: "Вероятная регрессия в retry policy последнего релиза.",
    action: "Проверить diff, сравнить error rate до и после релиза, выполнить rollback при подтверждении."
  },
  {
    title: "Рост задержки под нагрузкой",
    service: "catalog-svc",
    signals: "p95 latency, CPU pressure, queue depth",
    summary: "catalog-svc деградирует под пиковым traffic без явного release trigger.",
    hypothesis: "Нагрузка на search-index queue и CPU saturation.",
    action: "Проверить capacity, queue workers, hot endpoints и autoscaling."
  },
  {
    title: "Тайм-аут внешнего API",
    service: "checkout-svc",
    signals: "external_api_error_rate, timeout logs, circuit breaker",
    summary: "checkout деградирует из-за timeout внешнего loyalty API.",
    hypothesis: "Проблема интеграции или деградация upstream API.",
    action: "Включить fallback, проверить circuit breaker и связаться с владельцем dependency."
  },
  {
    title: "Неполный сигнал и низкая уверенность",
    service: "profile-svc",
    signals: "одно оповещение, минимум логов и метрик, нет контекста развертывания",
    summary: "Сигнал неполный, система не делает уверенный вывод.",
    hypothesis: "Требуется ручная проверка и дополнительный контекст.",
    action: "Собрать дополнительные логи и метрики или отправить инцидент на эскалацию."
  }
];

const sections: DocsSection[] = [
  {
    id: "overview",
    title: "Обзор",
    icon: BookOpenText,
    keywords: ["обзор", "triage", "incident response", "сводка", "гипотеза"],
    body: (
      <p>
        Triage AI — это консоль для incident response. Она помогает дежурному инженеру и команде
        эскалации быстрее собрать контекст, получить автоматическую сводку, сформировать гипотезу причины
        и проверить подтверждающие данные.
      </p>
    )
  },
  {
    id: "quick-start",
    title: "Быстрый старт",
    icon: ListChecks,
    keywords: ["быстрый старт", "вход", "панель", "сценарий"],
    body: (
      <ol>
        <li>Войдите в личный кабинет через тестовый доступ.</li>
        <li>Откройте панель управления.</li>
        <li>Выберите демонстрационный сценарий и нажмите кнопку запуска.</li>
        <li>Откройте созданный инцидент.</li>
        <li>Проверьте сводку ИИ, гипотезу причины и подтверждающие данные.</li>
        <li>Примите инцидент в работу, отправьте на эскалацию или закройте.</li>
      </ol>
    )
  },
  {
    id: "triage-flow",
    title: "Как работает разбор инцидентов",
    icon: Workflow,
    keywords: ["prometheus", "elk", "сопоставление", "анализ", "уверенность"],
    body: (
      <div className="docs-flow">
        {[
          ["Сигналы", "Prometheus/ELK и синтетические adapters отдают метрики, логи и оповещения."],
          ["Нормализация", "Система приводит события к единому формату и связывает их с сервисом."],
          ["Сопоставление", "Метрики, логи и контекст развертывания связываются по timeline."],
          ["Анализ ИИ", "Провайдер формирует сводку, гипотезу причины и уровень уверенности."],
          ["Передача контекста", "Дежурный инженер или эскалация получают готовые действия и цепочку подтверждающих данных."]
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
    id: "incident-workspace",
    title: "Incident Workspace",
    icon: SearchCheck,
    keywords: ["workspace", "инцидент", "evidence", "timeline", "действия"],
    body: (
      <div className="docs-card-grid two">
        <article className="docs-mini-card">
          <strong>Главный экран разбора</strong>
          <p>/incidents/:id показывает AI-сводку, гипотезу причины, confidence, подтверждающие данные, хронологию и действия.</p>
        </article>
        <article className="docs-mini-card">
          <strong>Что видит инженер за 30 секунд</strong>
          <p>Где инцидент, какой сервис затронут, почему система так считает, какие evidence есть и какой следующий шаг безопаснее.</p>
        </article>
      </div>
    )
  },
  {
    id: "ai-copilot",
    title: "AI-ассистент",
    icon: Bot,
    keywords: ["copilot", "ассистент", "чат", "цитаты", "handoff"],
    body: (
      <div className="docs-card-grid two">
        <article className="docs-mini-card">
          <strong>Контекстный, не общий чат</strong>
          <p>Ассистент работает только с выбранным incident context и отвечает через evidence refs, logs, metrics и deploy events.</p>
        </article>
        <article className="docs-mini-card">
          <strong>Быстрые команды</strong>
          <p>Объяснить гипотезу, показать ключевые логи, найти изменения перед инцидентом, предложить первый шаг и подготовить сводку для эскалации.</p>
        </article>
      </div>
    )
  },
  {
    id: "evidence-first",
    title: "Evidence-first подход",
    icon: ShieldCheck,
    keywords: ["evidence", "confidence", "низкая уверенность", "trust"],
    body: (
      <div className="docs-callout">
        Triage AI не должен выдумывать root cause. При низкой уверенности система явно говорит, что сигналов недостаточно,
        показывает доступные подтверждающие данные и предлагает ручные проверки.
      </div>
    )
  },
  {
    id: "scenarios",
    title: "Демонстрационные сценарии",
    icon: PlaySquare,
    keywords: ["регрессия", "задержка", "api", "низкая уверенность", "сценарий"],
    body: (
      <div className="docs-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Сценарий</th>
              <th>Сервис</th>
              <th>Входные сигналы</th>
              <th>Ожидаемая сводка</th>
              <th>Рекомендуемое действие</th>
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
    icon: Plug,
    keywords: ["prometheus", "elk", "telegram", "slack", "email", "secrets"],
    body: (
      <div className="docs-card-grid">
        {[
          ["Метрики Prometheus", "Источник метрик и SLO-сигналов.", "тестовый режим", "endpoint, read-only Token, alert rules"],
          ["Логи ELK", "Источник логов, trace id и контекста ошибок.", "тестовый режим", "ELK endpoint, index pattern, service account"],
          ["Оповещения Telegram", "Уведомления для дежурного инженера и deep links.", "тестовый режим", "bot Token, chat id, notification policy"],
          ["Оповещения Slack", "Командные уведомления об инцидентах.", "отключено", "Slack app, Webhook URL, workspace approval"],
          ["Email-оповещения", "Fallback-канал для уведомлений.", "отключено", "SMTP endpoint, sender identity, recipient groups"],
          ["Провайдер анализа ИИ", "Сводка, гипотеза причины и уровень уверенности.", "тестовый режим", "API key, data policy, evaluation controls"]
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
    id: "ai-providers",
    title: "Провайдеры ИИ",
    icon: Bot,
    keywords: ["provider", "llm", "yandexgpt", "gigachat", "openai", "secrets"],
    body: (
      <dl className="docs-definitions">
        <div><dt>Тестовый provider</dt><dd>Включён по умолчанию и работает на синтетическом контексте без внешних вызовов.</dd></div>
        <div><dt>YandexGPT / GigaChat / OpenAI / Custom endpoint</dt><dd>Показываются как production-ready границы подключения, но без backend env или secrets manager возвращают статус “нужна настройка”.</dd></div>
        <div><dt>Безопасность ключей</dt><dd>Frontend не принимает и не хранит API-ключи. Production-ключи должны жить только в backend env или secrets manager.</dd></div>
      </dl>
    )
  },
  {
    id: "test-mode",
    title: "Тестовый режим",
    icon: FlaskConical,
    keywords: ["тестовый режим", "синтетические данные", "secrets"],
    body: (
      <div className="docs-callout">
        Triage AI сейчас работает в тестовом режиме. Данные синтетические и нужны для демонстрации полного
        цикла разбора инцидента без подключения реальных secrets.
      </div>
    )
  },
  {
    id: "roles",
    title: "Роли",
    icon: UsersRound,
    keywords: ["дежурный инженер", "эскалация", "роль"],
    body: (
      <div className="docs-card-grid two">
        <article className="docs-mini-card">
          <strong>Дежурный инженер</strong>
          <p>Фокус на impact, affected service и ближайшем безопасном действии: принять инцидент, проверить сервис, подготовить rollback или эскалацию.</p>
        </article>
        <article className="docs-mini-card">
          <strong>Эскалация</strong>
          <p>Фокус на подтверждающих данных, timeline, уровне уверенности и качестве handoff-контекста для профильной команды.</p>
        </article>
      </div>
    )
  },
  {
    id: "statuses",
    title: "Статусы и метрики",
    icon: ChartNoAxesCombined,
    keywords: ["критичные", "активные", "закрыт", "эскалирован", "низкая уверенность"],
    body: (
      <dl className="docs-definitions">
        <div><dt>Активные критичные</dt><dd>Количество critical incidents, которые ещё не закрыты.</dd></div>
        <div><dt>Проанализировано ИИ</dt><dd>Количество инцидентов, где сформированы сводка и гипотеза причины.</dd></div>
        <div><dt>Низкая уверенность</dt><dd>Случаи, где сигнал неполный и гипотеза требует ручной проверки.</dd></div>
        <div><dt>В работе / На эскалации / Закрыт</dt><dd>Состояния жизненного цикла инцидента в продуктовой консоли.</dd></div>
      </dl>
    )
  },
  {
    id: "pilot-metrics",
    title: "Метрики пилота",
    icon: ChartNoAxesCombined,
    keywords: ["pilot", "time to hypothesis", "rca coverage", "adoption", "nps"],
    body: (
      <div className="docs-pilot-metrics">
        <div className="docs-callout">
          Гипотезы пилота, не доказанный эффект. Эти KPI проверяют ценность Triage AI в пилоте и не должны
          читаться как уже достигнутые production-результаты.
        </div>
        <div className="docs-card-grid two">
          {pilotMetrics.map((metric) => (
            <article key={metric.label} className="docs-mini-card">
              <strong>{metric.label}</strong>
              <code>{metric.value}</code>
              <p>{metric.caption}</p>
            </article>
          ))}
        </div>
        <dl className="docs-definitions">
          <div><dt>Time to Hypothesis</dt><dd>Измеряется A/B сравнением: baseline без Triage AI против flow с автоматической сводкой и evidence.</dd></div>
          <div><dt>RCA Coverage</dt><dd>Проверяется по post-incident документации: есть ли зафиксированная причина, evidence и следующий шаг.</dd></div>
          <div><dt>Adoption</dt><dd>Считается по логам продукта: сколько дежурных инженеров реально открывают AI-сводку при alert.</dd></div>
          <div><dt>Pivot criteria</dt><dd>Если Time to Hypothesis, RCA Coverage или NPS не подтверждаются, это основание для pivot, а не для подгонки цифр.</dd></div>
        </dl>
      </div>
    )
  },
  {
    id: "demo-script",
    title: "Сценарий демонстрации продукта",
    icon: PlaySquare,
    keywords: ["демонстрация", "script", "workspace", "copilot"],
    body: (
      <ol>
        <li>Открыть landing и показать позиционирование Triage AI.</li>
        <li>Войти через тестовый доступ.</li>
        <li>Запустить сценарий “Регрессия после релиза”.</li>
        <li>Открыть созданный /incidents/:id.</li>
        <li>Показать AI-сводку, гипотезу, confidence и хронологию.</li>
        <li>Нажать “Объяснить гипотезу” и показать evidence refs.</li>
        <li>Спросить AI-ассистента “Что проверить первым?”.</li>
        <li>Показать связь с deploy events и ключевые логи.</li>
        <li>Скопировать сводку для эскалации.</li>
        <li>Открыть Интеграции и показать провайдеров ИИ.</li>
      </ol>
    )
  },
  {
    id: "faq",
    title: "FAQ",
    icon: CircleHelp,
    keywords: ["faq", "production", "secrets", "ии"],
    body: (
      <Accordion type="single" collapsible className="faq-list faq-list--accordion">
        {[
          ["Почему данные тестовые?", "Синтетические сигналы позволяют безопасно проверить полный flow без реальных secrets и customer data."],
          ["Можно ли подключить реальные Prometheus/ELK?", "Да, через production adapters, endpoint allowlist и secrets manager."],
          ["Что означает низкая уверенность?", "Система не уверена в гипотезе причины, потому что сигнал неполный или подтверждающие данные слабые."],
          ["Заменяет ли ИИ инженера?", "Нет. ИИ ускоряет сбор контекста, но решение остаётся за дежурным инженером или эскалацией."],
          ["Где хранятся secrets?", "Реальные secrets должны храниться во внешнем secrets manager, а frontend получает только статусы настройки."],
          ["Что нужно для production версии?", "Подключить реальные источники данных, auth, RBAC, observability, audit log и deployment pipeline."]
        ].map(([question, answer], index) => (
          <AccordionItem key={question} value={`faq-${index}`}>
            <AccordionTrigger>{question}</AccordionTrigger>
            <AccordionContent>
              <p>{answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    )
  }
];

function sectionMatches(section: DocsSection, query: string) {
  if (!query) return true;
  const haystack = [section.title, ...section.keywords].join(" ").toLowerCase();
  return haystack.includes(query);
}

export function DocsContent({ appShell = false }: { appShell?: boolean }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filteredSections = useMemo(() => sections.filter((section) => sectionMatches(section, query)), [query]);

  return (
    <main className={cn("docs-page", appShell && "docs-page--app")}>
      <section className="docs-hero">
        {!appShell ? <Breadcrumb items={[{ label: "Документация" }]} /> : null}
        <h1>Документация</h1>
        <p>
          Продуктовое описание Triage AI: быстрый старт, логика разбора инцидентов,
          демонстрационные сценарии, интеграции, роли и ограничения тестового режима.
        </p>
        <div className="docs-hero__actions">
          <AnimatedGlowingSearchBar
            value={search}
            onChange={setSearch}
            onSubmit={() => {
              const first = filteredSections[0];
              if (first) document.getElementById(first.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            placeholder="Искать раздел документации..."
          />
          {!appShell ? (
            <Button asChild variant="outline">
              <Link to="/login">Войти в кабинет</Link>
            </Button>
          ) : null}
        </div>
      </section>

      <div className="docs-callout wide">
        Тестовый режим использует синтетические adapters. Production-подключения настраиваются через реальные источники данных и secrets manager.
      </div>

      <div className="docs-layout">
        <aside className="docs-nav">
          <strong>Разделы</strong>
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>{section.title}</a>
          ))}
        </aside>

        <div className="docs-content">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            return (
              <section key={section.id} id={section.id} className="docs-section">
                <div className="docs-section__heading">
                  <Icon size={19} aria-hidden="true" />
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
        </div>
      </div>
    </main>
  );
}
