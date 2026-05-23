import { CheckCircle2, Info, ShieldCheck, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Button } from "@/components/ui/button";

const ROLE_KEY = "triage-ai-role";
const GUIDE_KEY = "triage-ai-guide-visible";

export function SettingsPage() {
  const { session } = useAuth();
  const [role, setRole] = useState(() => {
    if (typeof window === "undefined") return "on-call";
    return window.localStorage.getItem(ROLE_KEY) === "escalation" ? "escalation" : "on-call";
  });
  const [theme, setTheme] = useState("system");
  const [message, setMessage] = useState("");

  useEffect(() => {
    window.localStorage.setItem(ROLE_KEY, role);
    setMessage("Роль по умолчанию сохранена");
  }, [role]);

  useEffect(() => {
    const readTheme = () => setTheme(window.localStorage.getItem("triage-ai-theme") ?? "system");
    readTheme();
    window.addEventListener("storage", readTheme);
    window.addEventListener("triage-ai-theme-change", readTheme);
    return () => {
      window.removeEventListener("storage", readTheme);
      window.removeEventListener("triage-ai-theme-change", readTheme);
    };
  }, []);

  return (
    <div className="settings-page">
      {message ? (
        <div className="inline-status" role="status">
          <Info size={16} />
          {message}
        </div>
      ) : null}

      <section className="settings-grid">
        <article className="ops-panel settings-card">
          <div className="settings-card__icon">
            <UserCircle size={22} />
          </div>
          <h2>Demo user</h2>
          <p>Mock auth session хранится в localStorage и не является production security.</p>
          <dl>
            <div><dt>Email</dt><dd>{session?.email}</dd></div>
            <div><dt>Имя</dt><dd>{session?.name}</dd></div>
            <div><dt>Session</dt><dd>{session?.createdAt ? new Date(session.createdAt).toLocaleString("ru-RU") : "активна"}</dd></div>
          </dl>
        </article>

        <article className="ops-panel settings-card">
          <div className="settings-card__icon">
            <ShieldCheck size={22} />
          </div>
          <h2>Роль по умолчанию</h2>
          <p>Role switch влияет на подсказки и recommended next steps в Dashboard.</p>
          <div className="segmented-control">
            <button type="button" className={role === "on-call" ? "active" : ""} onClick={() => setRole("on-call")}>On-call</button>
            <button type="button" className={role === "escalation" ? "active" : ""} onClick={() => setRole("escalation")}>Escalation</button>
          </div>
        </article>

        <article className="ops-panel settings-card">
          <div className="settings-card__icon">
            <CheckCircle2 size={22} />
          </div>
          <h2>Theme</h2>
          <p>Переключатель меняет `.dark` на documentElement и сохраняет выбор.</p>
          <div className="settings-row">
            <span>Текущий режим: {theme}</span>
            <AnimatedThemeToggler />
          </div>
        </article>

        <article className="ops-panel settings-card">
          <div className="settings-card__icon">
            <Info size={22} />
          </div>
          <h2>mock mode status</h2>
          <p>Real adapters и secrets management отключены для защиты demo и reproducible запуска.</p>
          <ul className="settings-list">
            <li><CheckCircle2 size={15} />Synthetic Prometheus/ELK signals доступны</li>
            <li><CheckCircle2 size={15} />AI provider работает rules-based без внешних keys</li>
            <li><CheckCircle2 size={15} />Secrets в коде не хранятся</li>
          </ul>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.localStorage.removeItem(GUIDE_KEY);
              setMessage("Инструкция Dashboard снова будет показана");
            }}
          >
            Сбросить инструкцию
          </Button>
        </article>

        <article className="ops-panel settings-card disabled-card">
          <h2>Production auth</h2>
          <p>RBAC, SSO и audit log требуют backend auth и инфраструктурного решения Cloud.ru.</p>
          <Button type="button" disabled>
            Недоступно в MVP
          </Button>
        </article>
      </section>
    </div>
  );
}
