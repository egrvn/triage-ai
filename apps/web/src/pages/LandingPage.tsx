import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BrainCircuit,
  CheckCircle2,
  GitBranch,
  LineChart,
  Network,
  ShieldCheck,
  Workflow
} from "lucide-react";
import { Link } from "react-router-dom";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Button } from "@/components/ui/button";

const demoScenarios = [
  "Release regression: HTTP 5xx spike",
  "Latency degradation under load",
  "External API timeout",
  "Sparse signal: low confidence fallback"
];

const features = [
  { title: "Incident triage", text: "Собирает context из Alerts, Logs, Metrics и Deployment timeline.", icon: AlertTriangle },
  { title: "Deploy correlation", text: "Связывает рост error rate с последним Release или Deployment.", icon: GitBranch },
  { title: "AI summary", text: "Формирует краткую сводку для on-call и escalation.", icon: BrainCircuit },
  { title: "Low confidence fallback", text: "Не выдумывает root cause, когда signal неполный.", icon: ShieldCheck },
  { title: "Интеграции", text: "Prometheus, ELK, Telegram, Slack, Email и AI provider в mock mode.", icon: Network },
  { title: "Explainability", text: "Показывает evidence: Metrics, Logs и Deployments.", icon: CheckCircle2 }
];

export function LandingPage() {
  return (
    <div className="marketing-page">
      <header className="marketing-nav">
        <Link className="brand-block" to="/">
          <div className="brand-mark">T</div>
          <div>
            <strong>Triage AI</strong>
            <span>DevOps Control Center</span>
          </div>
        </Link>
        <nav>
          <a href="#problem">Проблема</a>
          <a href="#solution">Решение</a>
          <a href="#demo-scenarios">Demo</a>
          <Link to="/docs">Документация</Link>
        </nav>
        <div className="marketing-nav__actions">
          <AnimatedThemeToggler />
          <Button asChild>
            <Link to="/login">Войти</Link>
          </Button>
        </div>
      </header>

      <BackgroundPaths
        title="Triage AI для быстрых incident response"
        subtitle="Автоматизируйте первичный анализ инцидентов, находите root-cause hypothesis и связывайте Alerts, Logs, Metrics и Deployments в одном Dashboard."
      />

      <section className="marketing-section problem-section" id="problem">
        <div>
          <h2>Когда Alerts больше, чем контекста</h2>
          <p>
            On-call инженер тратит первые минуты на ручной triage: открывает Grafana, ищет Logs,
            проверяет Deployments и собирает timeline. Triage AI сокращает этот путь до одной рабочей панели.
          </p>
        </div>
        <div className="problem-grid">
          {["alert fatigue", "ручной triage", "разрозненные Logs и Metrics", "нагрузка на on-call"].map((item) => (
            <article key={item} className="surface-card">
              <Bell size={18} />
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section split-section" id="solution">
        <div>
          <h2>Единый context для on-call и escalation</h2>
          <p>
            Система делает auto-summary, предлагает root-cause hypothesis, проверяет deploy correlation
            и показывает evidence. Решение остается human-in-the-loop: AI помогает, но не заменяет инженера.
          </p>
          <Button asChild size="lg">
            <Link to="/login">
              Начать работу
              <ArrowRight size={17} />
            </Link>
          </Button>
        </div>
        <div className="workflow-card">
          {[
            ["Prometheus / ELK", "ingestion"],
            ["Normalization", "signals"],
            ["Correlation engine", "Logs + Metrics + Deployment"],
            ["AI analysis", "summary + hypothesis"],
            ["Handoff", "on-call / escalation"]
          ].map(([title, label]) => (
            <div key={title} className="workflow-row">
              <Workflow size={16} />
              <span>{title}</span>
              <small>{label}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="marketing-section">
        <div className="section-heading">
          <h2>Возможности MVP</h2>
          <p>Фокус Release 1 — reactive incident triage без production secrets.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="surface-card feature-card">
                <Icon size={20} />
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="marketing-section demo-section" id="demo-scenarios">
        <div className="section-heading">
          <h2>Demo scenarios</h2>
          <p>Сценарии показывают end-to-end flow от synthetic signal до evidence.</p>
        </div>
        <div className="demo-scenario-strip">
          {demoScenarios.map((scenario) => (
            <article key={scenario} className="scenario-preview">
              <LineChart size={18} />
              <strong>{scenario}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-cta">
        <h2>Готово к demo на защите</h2>
        <p>Войдите в кабинет, запустите scenario и покажите AI summary, evidence и actions.</p>
        <div>
          <Button asChild size="lg">
            <Link to="/login">Открыть Dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/docs">Читать документацию</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
