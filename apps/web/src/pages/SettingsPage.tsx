import { CheckCircle2, Info, ShieldCheck, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

  const selectRole = (nextRole: "on-call" | "escalation") => {
    setRole(nextRole);
    window.localStorage.setItem(ROLE_KEY, nextRole);
    setMessage("Роль по умолчанию сохранена");
  };

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
          <h2>Тестовый пользователь</h2>
          <p>Тестовая сессия хранится в localStorage и не является production security.</p>
          <dl>
            <div><dt>Email</dt><dd>{session?.email}</dd></div>
            <div><dt>Имя</dt><dd>{session?.name}</dd></div>
            <div><dt>Сессия</dt><dd>{session?.createdAt ? new Date(session.createdAt).toLocaleString("ru-RU") : "активна"}</dd></div>
          </dl>
        </article>

        <article className="ops-panel settings-card">
          <div className="settings-card__icon">
            <ShieldCheck size={22} />
          </div>
          <h2 id="default-role-title">Роль по умолчанию</h2>
          <p>Переключатель роли влияет на подсказки и рекомендуемые действия в панели управления.</p>
          <div className="segmented-control role-segmented-control" role="radiogroup" aria-labelledby="default-role-title">
            <button
              type="button"
              role="radio"
              aria-checked={role === "on-call"}
              className={role === "on-call" ? "active" : ""}
              onClick={() => selectRole("on-call")}
            >
              Дежурный инженер
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={role === "escalation"}
              className={role === "escalation" ? "active" : ""}
              onClick={() => selectRole("escalation")}
            >
              Эскалация
            </button>
          </div>
        </article>

        <article className="ops-panel settings-card">
          <div className="settings-card__icon">
            <CheckCircle2 size={22} />
          </div>
          <h2>Тема</h2>
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
          <h2>Статус тестового режима</h2>
          <p>Реальные адаптеры и secrets manager отключены для безопасного воспроизводимого запуска.</p>
          <ul className="settings-list">
            <li><CheckCircle2 size={15} />Синтетические сигналы Prometheus/ELK доступны</li>
            <li><CheckCircle2 size={15} />AI-провайдер работает на правилах без внешних API-ключей</li>
            <li><CheckCircle2 size={15} />Secrets в коде не хранятся</li>
          </ul>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.localStorage.removeItem(GUIDE_KEY);
              setMessage("Инструкция в панели управления снова будет показана");
            }}
          >
            Сбросить инструкцию
          </Button>
        </article>

        <article className="ops-panel settings-card disabled-card">
          <h2>Production-аутентификация</h2>
          <p>RBAC, SSO и audit log требуют backend auth и корпоративной инфраструктуры.</p>
          <Button asChild variant="outline">
            <Link to="/roadmap">
            В roadmap
            </Link>
          </Button>
        </article>
      </section>
    </div>
  );
}
