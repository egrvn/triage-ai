import {
  Activity,
  ArrowRight,
  BellRing,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  FileText,
  GitBranch,
  GitMerge,
  Layers3,
  ListChecks,
  MessagesSquare,
  Network,
  PlugZap,
  SearchCheck,
  ShieldCheck,
  UsersRound,
  Workflow
} from "lucide-react";
import { Link } from "react-router-dom";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { BGPattern } from "@/components/ui/bg-pattern";
import { Button } from "@/components/ui/button";
import { DottedSurface } from "@/components/ui/dotted-surface";
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
    icon: FileText
  },
  {
    title: "Гипотеза причины",
    text: "Triage AI показывает вероятную причину и явно отделяет уверенные выводы от слабых сигналов.",
    icon: SearchCheck
  },
  {
    title: "Связь с развертыванием",
    text: "Инцидент сопоставляется с релизами, ветками и изменениями в affected service.",
    icon: GitBranch
  },
  {
    title: "Подтверждающие данные",
    text: "В карточке инцидента видны логи, метрики, timeline и аргументы, на которых построен вывод.",
    icon: ListChecks
  },
  {
    title: "Тестовые интеграции",
    text: "Prometheus, ELK и каналы уведомлений работают в тестовом режиме без реальных secrets.",
    icon: PlugZap
  },
  {
    title: "Роли для команды",
    text: "Дежурный инженер видит быстрые действия, эскалация получает полный контекст и цепочку подтверждающих данных.",
    icon: UsersRound
  }
];

const scenarios = [
  { title: "Регрессия после релиза: всплеск HTTP 5xx", icon: GitBranch },
  { title: "Рост задержки под нагрузкой", icon: Activity },
  { title: "Тайм-аут внешнего API", icon: Clock3 },
  { title: "Неполный сигнал и низкая уверенность", icon: ShieldCheck }
];

const flow = [
  { title: "Сигналы", text: "Prometheus, ELK, API и каналы уведомлений", icon: Activity },
  { title: "Нормализация", text: "События приводятся к единому формату", icon: Workflow },
  { title: "Сопоставление", text: "Логи, метрики и развертывания связываются по времени", icon: GitMerge },
  { title: "Анализ ИИ", text: "Формируется сводка, гипотеза и уровень уверенности", icon: BrainCircuit },
  { title: "Решение", text: "Команда выбирает действие и передаёт контекст дальше", icon: CheckCircle2 }
];

export function LandingPage() {
  return (
    <div className="marketing-page">
      <SiteHeader />

      <main>
        <section className="hero-section">
          <BGPattern className="hero-section__pattern" variant="dots" mask="fade-edges" size={20} />
          <DottedSurface className="hero-section__surface" />
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
              <Button asChild size="lg">
                <Link to="/login">
                  Войти в кабинет
                  <ArrowRight size={17} />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#features">Посмотреть возможности</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="marketing-section problem-section" id="problem">
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
          </div>
        </section>

        <section className="marketing-section" id="how-it-works">
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
          <div className="section-heading">
            <span className="section-kicker">Возможности</span>
            <h2>Минимальный набор, который нужен для демонстрации продукта</h2>
            <p>Фокус MVP — понятный разбор инцидента, прозрачность выводов и рабочие сценарии без реальных secrets.</p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="surface-card feature-card">
                  <Icon size={34} aria-hidden="true" />
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="marketing-section scenarios-section" id="scenarios">
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
              <article key={scenario.title} className="scenario-preview">
                <Icon size={28} aria-hidden="true" />
                <strong>{scenario.title}</strong>
              </article>
              );
            })}
          </div>
        </section>

        <section className="marketing-cta">
          <BGPattern className="marketing-cta__pattern" variant="dots" mask="fade-edges" size={18} />
          <Layers3 size={28} aria-hidden="true" />
          <h2>Попробуйте Triage AI в тестовом режиме</h2>
          <p>
            Откройте личный кабинет, запустите демонстрационный сценарий и проверьте,
            как команда получает общий контекст для incident response.
          </p>
          <div>
            <Button asChild size="lg">
              <Link to="/login">Перейти в личный кабинет</Link>
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
