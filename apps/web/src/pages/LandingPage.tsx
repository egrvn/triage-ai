import {
  Activity,
  ArrowRight,
  BellRing,
  Bot,
  CheckCircle2,
  Clock3,
  Cpu,
  GitBranch,
  GitCommitVertical,
  KeyRound,
  Layers3,
  ListChecks,
  MessagesSquare,
  Network,
  PlugZap,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Waypoints,
  Workflow
} from "lucide-react";
import { Link } from "react-router-dom";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BGPattern } from "@/components/ui/bg-pattern";
import { Button } from "@/components/ui/button";
import { FallingPatternBackground } from "@/components/ui/falling-pattern-background";
import { MatrixText } from "@/components/ui/matrix-text";

const serviceCards = [
  {
    title: "Incident Workspace",
    text: "Единая карточка инцидента со сводкой, контекстом, evidence и действиями.",
    icon: SearchCheck,
    href: "#workspace"
  },
  {
    title: "AI-ассистент",
    text: "Контекстные ответы по выбранному инциденту, citations и безопасный handoff.",
    icon: Bot,
    href: "#workspace"
  },
  {
    title: "Подтверждающие данные",
    text: "Метрики, логи, alert и deploy events в одном проверяемом потоке.",
    icon: ListChecks,
    href: "#how-it-works"
  },
  {
    title: "Интеграции",
    text: "Prometheus, ELK, каналы уведомлений и API без хранения ключей во frontend.",
    icon: PlugZap,
    href: "#integrations"
  },
  {
    title: "Провайдеры ИИ",
    text: "Тестовый provider по умолчанию и production-ready границы для YandexGPT, GigaChat и OpenAI.",
    icon: Cpu,
    href: "#integrations"
  },
  {
    title: "Метрики пилота",
    text: "Time to Hypothesis, RCA Coverage и adoption как проверяемые метрики внедрения.",
    icon: Activity,
    href: "/docs#pilot-metrics"
  }
];

const problems = [
  {
    title: "Слишком много оповещений",
    text: "Сигналов больше, чем контекста: дежурному инженеру приходится вручную отделять важное от шума.",
    icon: BellRing
  },
  {
    title: "Ручной разбор занимает минуты",
    text: "Первые минуты уходят на проверку логов, метрик, timeline и последних изменений.",
    icon: Clock3
  },
  {
    title: "Контекст разбросан",
    text: "Логи, метрики, оповещения и развертывания живут в разных инструментах и теряют связь.",
    icon: Network
  },
  {
    title: "Эскалация теряет детали",
    text: "При передаче инцидента команда получает неполный контекст и повторяет анализ.",
    icon: MessagesSquare
  }
];

const flow = [
  { title: "Alert", text: "Система получает сигнал из мониторинга или канала уведомлений.", icon: Activity },
  { title: "Сбор контекста", text: "Логи, метрики и deploy events приводятся к единой карточке.", icon: Workflow },
  { title: "AI-сводка", text: "Формируется описание impact, affected service и гипотеза причины.", icon: Sparkles },
  { title: "Evidence", text: "Инженер видит подтверждающие данные и counter-signals.", icon: ShieldCheck },
  { title: "Действие инженера", text: "Контекст принимается в работу, эскалируется или закрывается.", icon: CheckCircle2 }
];

const scenarios = [
  {
    title: "Регрессия после релиза: всплеск HTTP 5xx",
    service: "payment-svc",
    severity: "Критичный",
    severityTone: "critical",
    icon: GitBranch
  },
  {
    title: "Рост задержки под нагрузкой",
    service: "catalog-svc",
    severity: "Средний",
    severityTone: "warning",
    icon: Activity
  },
  {
    title: "Тайм-аут внешнего API",
    service: "checkout-svc",
    severity: "Критичный",
    severityTone: "critical",
    icon: Clock3
  },
  {
    title: "Неполный сигнал и низкая уверенность",
    service: "profile-svc",
    severity: "Низкая уверенность",
    severityTone: "low",
    icon: ShieldCheck
  }
];

const integrations = ["Prometheus", "ELK", "Telegram", "Slack", "Email", "YandexGPT", "GigaChat", "OpenAI", "Mock provider"];

const faq = [
  ["Почему данные тестовые?", "Синтетические сигналы позволяют безопасно проверить полный цикл разбора без подключения реальных secrets."],
  ["Заменяет ли ИИ инженера?", "Нет. Triage AI собирает контекст, объясняет гипотезу и предлагает следующий шаг, но решение остаётся за инженером."],
  ["Можно ли подключить реальные Prometheus и ELK?", "Да. Для production нужны adapters, backend env или secrets manager, read-only доступы и data policy."],
  ["Что происходит при низкой уверенности?", "Ассистент честно говорит, что сигналов недостаточно, не выдумывает root cause и предлагает ручные проверки."]
];

export function LandingPage() {
  return (
    <div className="marketing-page cloud-marketing-page">
      <SiteHeader />

      <main>
        <section className="hero-section cloud-hero">
          <FallingPatternBackground className="cloud-hero__portal" density={24} intensity="normal" duration={26} />
          <div className="cloud-hero__wash" aria-hidden="true" />
          <div className="hero-section__content cloud-hero__content">
            <div className="hero-kicker">
              <Activity size={16} aria-hidden="true" />
              AI-слой для incident response
            </div>
            <h1>Разбор инцидентов <MatrixText text="без хаоса" /></h1>
            <p>
              Triage AI собирает логи, метрики, оповещения и события развертываний в единую карточку
              инцидента, формирует гипотезу причины и помогает дежурному инженеру выбрать следующий шаг.
            </p>
            <div className="hero-section__actions">
              <Button asChild size="lg">
                <Link to="/login">
                  Войти в кабинет
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#scenarios">Посмотреть сценарии</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="marketing-section service-catalog-section" id="features">
          <div className="section-heading">
            <span className="section-kicker">Возможности</span>
            <h2>Начните с ключевых возможностей</h2>
            <p>Как в cloud console: сначала понятные сервисы, затем рабочий сценарий и точка входа в кабинет.</p>
          </div>
          <div className="service-card-grid">
            {serviceCards.map(({ title, text, icon: Icon, href }) => (
              <article key={title} className="surface-card service-card">
                <div className="surface-card__icon"><Icon size={22} aria-hidden="true" /></div>
                <h3>{title}</h3>
                <p>{text}</p>
                <a href={href}>
                  Подробнее
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="marketing-section problem-section" id="problem">
          <BGPattern className="section-pattern section-pattern--right" variant="grid" mask="fade-left" size={28} />
          <div>
            <span className="section-kicker">Проблема</span>
            <h2>Инженер тонет не в данных, а в разрозненном контексте</h2>
            <p>
              При alert команда открывает несколько систем, сверяет события по времени и пытается понять,
              где симптом, а где причина. Triage AI превращает этот хаос в рабочую карточку инцидента.
            </p>
          </div>
          <div className="problem-grid">
            {problems.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="surface-card problem-card">
                  <div className="surface-card__icon"><Icon size={22} aria-hidden="true" /></div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="marketing-section split-section" id="solution">
          <BGPattern className="section-pattern section-pattern--left" variant="dots" mask="fade-right" size={24} />
          <div>
            <span className="section-kicker">Решение</span>
            <h2>Портал от alert к понятному incident context</h2>
            <p>
              Продукт собирает подтверждающие данные, объясняет гипотезу и сохраняет контекст для
              дежурного инженера, эскалации и последующего анализа. ИИ ускоряет разбор, но не принимает
              production-решения автономно.
            </p>
            <Button asChild size="lg">
              <Link to="/login">
                Открыть консоль
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <div className="solution-card cloud-console-preview">
            <div className="solution-card__header">
              <Layers3 size={20} aria-hidden="true" />
              <strong>Cloud-like console</strong>
            </div>
            <p>
              Личный кабинет разделяет обзор, список инцидентов, рабочую область, интеграции и документацию.
              Это помогает быстро понять следующий шаг, а не искать нужный экран.
            </p>
          </div>
        </section>

        <section className="marketing-section" id="how-it-works">
          <div className="section-heading">
            <span className="section-kicker">Как работает</span>
            <h2>От сигнала до действия за один поток</h2>
          </div>
          <div className="workflow-card cloud-workflow-card">
            {flow.map(({ title, text, icon: Icon }, index) => (
              <div key={title} className="workflow-row">
                <span>{index + 1}</span>
                <Icon size={16} aria-hidden="true" />
                <strong>{title}</strong>
                <small>{text}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="marketing-section scenarios-section" id="scenarios">
          <div className="section-heading">
            <span className="section-kicker">Сценарии</span>
            <h2>Сценарии для проверки incident flow</h2>
            <p>Каждый сценарий создаёт инцидент, обновляет метрики и ведёт в `/incidents/:id` для разбора.</p>
          </div>
          <div className="scenario-preview-grid cloud-scenario-grid">
            {scenarios.map((scenario) => {
              const Icon = scenario.icon;
              return (
                <article key={scenario.title} className="scenario-preview">
                  <Icon size={24} aria-hidden="true" />
                  <strong>{scenario.title}</strong>
                  <p>{scenario.service}</p>
                  <span className={`status-pill status-pill--${scenario.severityTone}`}>{scenario.severity}</span>
                </article>
              );
            })}
          </div>
        </section>

        <section className="marketing-section workspace-preview-section" id="workspace">
          <div className="section-heading">
            <span className="section-kicker">Главный рабочий экран</span>
            <h2>Incident Workspace показывает всё, что нужно за первые 30 секунд</h2>
          </div>
          <div className="workspace-preview-card">
            <div className="workspace-preview-card__summary">
              <span className="status-badge">INC-2026-042</span>
              <h3>Регрессия после релиза: рост HTTP 5xx</h3>
              <p>payment-svc показывает всплеск ошибок после deploy `feat/retry-logic-v2`.</p>
              <div className="workspace-preview-card__chips">
                <span>critical</span>
                <span>confidence: high</span>
                <span>payment-svc</span>
              </div>
            </div>
            <div className="workspace-preview-card__panels">
              <article><Sparkles size={18} aria-hidden="true" /><strong>AI Summary</strong><p>Что произошло, гипотеза причины и следующий шаг.</p></article>
              <article><ListChecks size={18} aria-hidden="true" /><strong>Evidence</strong><p>HTTP 5xx, error logs, deploy event и counter-signals.</p></article>
              <article><GitCommitVertical size={18} aria-hidden="true" /><strong>Timeline</strong><p>alert → deploy → metric spike → AI analysis → action.</p></article>
              <article><Bot size={18} aria-hidden="true" /><strong>Copilot</strong><p>Объясняет гипотезу и готовит сводку для эскалации.</p></article>
            </div>
          </div>
        </section>

        <section className="marketing-section integrations-preview-section" id="integrations">
          <div className="section-heading">
            <span className="section-kicker">Интеграции</span>
            <h2>Источники сигналов и AI providers без ключей во frontend</h2>
            <p>Production-подключения настраиваются через backend env или secrets manager. Для безопасной проверки включён тестовый контур.</p>
          </div>
          <div className="integration-logo-grid">
            {integrations.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
          <div className="docs-callout cloud-policy-callout">
            <KeyRound size={18} aria-hidden="true" />
            Frontend не принимает и не хранит API-ключи. Реальные secrets остаются production follow-up.
          </div>
        </section>

        <section className="marketing-section faq-section" id="faq">
          <div className="section-heading">
            <span className="section-kicker">FAQ</span>
            <h2>Коротко о тестовом режиме</h2>
          </div>
          <Accordion type="single" collapsible className="faq-list faq-list--accordion">
            {faq.map(([question, answer], index) => (
              <AccordionItem key={question} value={`item-${index}`}>
                <AccordionTrigger>{question}</AccordionTrigger>
                <AccordionContent>{answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="marketing-cta">
          <BGPattern className="marketing-cta__pattern" variant="dots" mask="fade-edges" size={18} />
          <Waypoints size={28} aria-hidden="true" />
          <h2>Откройте путь от alert к решению</h2>
          <p>
            Запустите сценарий, откройте рабочую область инцидента и проверьте
            evidence-first flow: summary, explainability, Copilot, action, feedback.
          </p>
          <div>
            <Button asChild size="lg">
              <Link to="/login">Перейти в кабинет</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/docs">Открыть документацию</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
