import {
  Activity,
  ArrowRight,
  BellRing,
  BrainCircuit,
  ChartSpline,
  CheckCircle2,
  Clock3,
  FileText,
  GitBranch,
  GitCommitVertical,
  GitMerge,
  Layers3,
  ListChecks,
  MessagesSquare,
  Network,
  PlugZap,
  SearchCheck,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  UsersRound,
  Workflow
} from "lucide-react";
import { Link } from "react-router-dom";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BGPattern } from "@/components/ui/bg-pattern";
import { Button } from "@/components/ui/button";
import { CelestialOrreryBackground } from "@/components/ui/celestial-orrery-background";
import { ShinyButton } from "@/components/ui/shiny-button";
import { SoftGradientBackground } from "@/components/ui/soft-gradient-background";
import { SpecialText } from "@/components/ui/special-text";

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
    title: "Контекст разбросан по системам",
    text: "Логи, метрики, оповещения и развертывания находятся в разных инструментах.",
    icon: Network
  },
  {
    title: "Эскалация теряет детали",
    text: "При передаче инцидента команда получает неполный контекст и повторяет анализ.",
    icon: MessagesSquare
  }
];

const features = [
  {
    title: "Автоматическая сводка",
    text: "Система собирает сигналы и формирует короткое описание impact, сервиса и текущего риска.",
    icon: FileText,
    preview: ["payment-svc", "Критичный", "Высокая уверенность"]
  },
  {
    title: "Гипотеза причины",
    text: "Triage AI показывает вероятную причину и явно отделяет уверенные выводы от слабых сигналов.",
    icon: SearchCheck,
    preview: ["HTTP 5xx", "развертывание 4 минуты назад", "RetryBudgetExceeded"]
  },
  {
    title: "Связь с развертыванием",
    text: "Инцидент сопоставляется с релизами, ветками и изменениями в affected service.",
    icon: GitBranch,
    preview: ["feat/retry-logic-v2", "commit a13f9c2", "rollback готов"]
  },
  {
    title: "Подтверждающие данные",
    text: "В карточке инцидента видны логи, метрики, timeline и аргументы, на которых построен вывод.",
    icon: ListChecks,
    preview: ["логи ошибок", "метрики p95", "timeline"]
  },
  {
    title: "Фильтр по логам",
    text: "Инциденты можно отбирать по сервису, severity, статусу, уверенности и уровню логов.",
    icon: Sparkles,
    preview: ["ошибка", "503", "payment-svc"]
  },
  {
    title: "Тестовые интеграции",
    text: "Prometheus, ELK и каналы уведомлений работают в тестовом режиме без реальных secrets.",
    icon: PlugZap,
    preview: ["Prometheus", "ELK", "Slack"]
  },
  {
    title: "Роли для команды",
    text: "Дежурный инженер видит быстрые действия, эскалация получает полный контекст и цепочку подтверждающих данных.",
    icon: UsersRound,
    preview: ["дежурный инженер", "эскалация", "handoff"]
  }
];

const scenarios = [
  {
    title: "Регрессия после релиза: всплеск HTTP 5xx",
    text: "payment-svc показывает рост ошибок сразу после нового развертывания.",
    service: "payment-svc",
    badge: "Критичный",
    icon: GitCommitVertical
  },
  {
    title: "Рост задержки под нагрузкой",
    text: "catalog-svc деградирует по p95/p99 latency во время пикового traffic.",
    service: "catalog-svc",
    badge: "Средний",
    icon: ChartSpline
  },
  {
    title: "Тайм-аут внешнего API",
    text: "checkout-svc теряет ответы upstream API и включает circuit breaker.",
    service: "checkout-svc",
    badge: "Средний",
    icon: Clock3
  },
  {
    title: "Неполный сигнал и низкая уверенность",
    text: "profile-svc получил слабый сигнал без достаточных логов и метрик.",
    service: "profile-svc",
    badge: "Низкая уверенность",
    icon: ShieldAlert
  }
];

const flow = [
  { title: "Сигналы", text: "Prometheus, ELK, API и каналы уведомлений", icon: Activity },
  { title: "Нормализация", text: "События приводятся к единому формату", icon: Workflow },
  { title: "Сопоставление", text: "Логи, метрики и развертывания связываются по времени", icon: GitMerge },
  { title: "Анализ ИИ", text: "Формируется сводка, гипотеза и уровень уверенности", icon: BrainCircuit },
  { title: "Решение", text: "Команда выбирает действие и передаёт контекст дальше", icon: CheckCircle2 }
];

const faq = [
  ["Почему данные тестовые?", "MVP использует синтетические данные, чтобы показать полный цикл разбора инцидента без подключения реальных secrets."],
  ["Можно ли подключить реальные Prometheus и ELK?", "Да. Для production потребуется настроить adapters, credentials и secrets management."],
  ["Что означает низкая уверенность?", "Системе не хватает сигналов для надёжной гипотезы. Такой инцидент нужно проверить вручную или отправить на эскалацию."],
  ["Заменяет ли ИИ инженера?", "Нет. Triage AI ускоряет сбор контекста и предлагает гипотезу, но финальное решение остаётся за инженером."],
  ["Где хранятся secrets?", "В MVP реальные secrets не используются. Для production нужно подключить безопасное хранилище секретов."]
];

export function LandingPage() {
  return (
    <div className="marketing-page">
      <SiteHeader />

      <main>
        <section className="hero-section">
          <CelestialOrreryBackground className="hero-section__orrery" intensity="normal" />
          <BGPattern className="hero-section__pattern" variant="dots" mask="fade-edges" size={22} />
          <div className="hero-section__content">
            <div className="hero-kicker">
              <Activity size={16} aria-hidden="true" />
              B2B SaaS для DevOps и SRE-команд
            </div>
            <h1>
              Разбор инцидентов <SpecialText>без хаоса</SpecialText>
            </h1>
            <p>
              Triage AI собирает сигналы из логов, метрик и оповещений, формирует сводку,
              показывает вероятную причину и помогает дежурному инженеру быстрее выбрать следующий шаг.
            </p>
            <div className="hero-section__actions">
              <ShinyButton asChild size="lg">
                <Link to="/login">
                  Войти в кабинет
                  <ArrowRight size={17} />
                </Link>
              </ShinyButton>
              <Button asChild variant="outline" size="lg">
                <a href="#features">Посмотреть возможности</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="marketing-section problem-section" id="problem">
          <SoftGradientBackground variant="corner" intensity="subtle" />
          <BGPattern className="section-pattern section-pattern--right" variant="grid" mask="fade-left" size={28} />
          <div>
            <span className="section-kicker">Проблема</span>
            <h2>Первые минуты инцидента уходят на поиск контекста</h2>
            <p>
              Дежурный инженер открывает несколько инструментов, сверяет timeline, ищет недавние изменения
              и пытается отделить симптом от причины. Чем дольше это длится, тем выше impact и сложнее эскалация.
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
          <SoftGradientBackground variant="section" intensity="subtle" />
          <BGPattern className="section-pattern section-pattern--left" variant="dots" mask="fade-right" size={24} />
          <div>
            <span className="section-kicker">Решение</span>
            <h2>Единый контекст для дежурного инженера и эскалации</h2>
            <p>
              Triage AI собирает сигналы, формирует автоматическую сводку, строит гипотезу причины,
              проверяет связь с развертыванием и показывает подтверждающие данные. ИИ ускоряет разбор,
              но решение остаётся за инженером.
            </p>
            <Button asChild size="lg">
              <Link to="/login">
                Начать работу
                <ArrowRight size={17} />
              </Link>
            </Button>
          </div>
          <div className="solution-card">
            <div className="solution-card__header">
              <ShieldCheck size={20} aria-hidden="true" />
              <strong>Тестовый режим</strong>
            </div>
            <p>
              MVP использует синтетические данные и не требует реальных secrets. Это позволяет показать полный
              цикл incident response без подключения production-систем.
            </p>
            <div className="solution-preview">
              <span>payment-svc</span>
              <strong>Вероятная регрессия после релиза</strong>
              <small>5xx rate вырос через 4 минуты после развертывания</small>
            </div>
          </div>
        </section>

        <section className="marketing-section" id="how-it-works">
          <SoftGradientBackground variant="top" intensity="subtle" />
          <BGPattern className="section-pattern section-pattern--wide" variant="diagonal-stripes" mask="fade-y" size={20} />
          <div className="section-heading">
            <span className="section-kicker">Как это работает</span>
            <h2>От сигнала до решения за один поток</h2>
          </div>
          <div className="workflow-card">
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

        <section className="marketing-section" id="features">
          <SoftGradientBackground variant="section" intensity="subtle" />
          <div className="section-heading">
            <span className="section-kicker">Возможности</span>
            <h2>Минимальный набор, который нужен для демонстрации продукта</h2>
            <p>Фокус MVP — понятный разбор инцидента, прозрачность выводов и рабочие сценарии без реальных secrets.</p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="surface-card feature-card bento-card">
                  <div className="bento-card__header">
                    <span className="surface-card__icon"><Icon size={21} aria-hidden="true" /></span>
                    <h3>{feature.title}</h3>
                  </div>
                  <p>{feature.text}</p>
                  <div className="bento-card__preview" aria-hidden="true">
                    {feature.preview.map((item) => <span key={item}>{item}</span>)}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="marketing-section scenarios-section" id="scenarios">
          <SoftGradientBackground variant="center" intensity="normal" />
          <BGPattern className="section-pattern section-pattern--right" variant="dots" mask="fade-x" size={18} />
          <div className="section-heading">
            <span className="section-kicker">Сценарии</span>
            <h2>Демонстрационные сценарии</h2>
            <p>Каждый сценарий создаёт инцидент, обновляет метрики и показывает сводку, гипотезу причины и подтверждающие данные.</p>
          </div>
          <div className="scenario-preview-grid">
            {scenarios.map((scenario) => {
              const Icon = scenario.icon;
              return (
              <article key={scenario.title} className="scenario-preview scenario-preview--bento">
                <div className="scenario-preview__top">
                  <span className="surface-card__icon"><Icon size={21} aria-hidden="true" /></span>
                  <span className="status-badge">{scenario.badge}</span>
                </div>
                <strong>{scenario.title}</strong>
                <p>{scenario.text}</p>
                <div className="scenario-preview__footer">
                  <code>{scenario.service}</code>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/login">Открыть сценарий</Link>
                  </Button>
                </div>
              </article>
              );
            })}
          </div>
        </section>

        <section className="marketing-section faq-section" id="faq">
          <SoftGradientBackground variant="section" intensity="subtle" />
          <div className="section-heading">
            <span className="section-kicker">FAQ</span>
            <h2>Частые вопросы о тестовом режиме</h2>
          </div>
          <Accordion type="single" collapsible className="faq-accordion">
            {faq.map(([question, answer], index) => (
              <AccordionItem key={question} value={`faq-${index}`}>
                <AccordionTrigger>{question}</AccordionTrigger>
                <AccordionContent>{answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="marketing-cta">
          <SoftGradientBackground variant="center" intensity="normal" />
          <BGPattern className="marketing-cta__pattern" variant="dots" mask="fade-edges" size={18} />
          <Layers3 size={28} aria-hidden="true" />
          <h2>Попробуйте Triage AI в тестовом режиме</h2>
          <p>
            Откройте личный кабинет, запустите демонстрационный сценарий и проверьте,
            как команда получает общий контекст для incident response.
          </p>
          <div>
            <ShinyButton asChild size="lg">
              <Link to="/login">Перейти в личный кабинет</Link>
            </ShinyButton>
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
