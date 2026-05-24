import {
  Activity,
  BookOpenText,
  Boxes,
  Gauge,
  LogOut,
  Settings,
  Shield,
  UserCircle
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { BrandLogo } from "@/components/BrandLogo";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { SoftGradientBackground } from "@/components/ui/soft-gradient-background";
import { IncidentWorkspaceProvider } from "@/features/incidents/incident-workspace";

const navItems = [
  { to: "/dashboard", label: "Панель управления", icon: Gauge },
  { to: "/incidents", label: "Инциденты", icon: Activity },
  { to: "/integrations", label: "Интеграции", icon: Boxes },
  { to: "/app/docs", label: "Документация", icon: BookOpenText },
  { to: "/settings", label: "Настройки", icon: Settings }
];

function pageMeta(pathname: string) {
  if (pathname.startsWith("/integrations")) {
    return {
      title: "Интеграции",
      description: "Источники сигналов и каналы уведомлений в тестовом режиме без реальных secrets.",
      breadcrumb: "Интеграции"
    };
  }
  if (pathname.startsWith("/settings")) {
    return {
      title: "Настройки",
      description: "Профиль тестового пользователя, роль по умолчанию, тема и статус тестового режима.",
      breadcrumb: "Настройки"
    };
  }
  if (pathname.startsWith("/app/docs")) {
    return {
      title: "Документация",
      description: "Справочник по Triage AI внутри личного кабинета.",
      breadcrumb: "Документация"
    };
  }
  if (pathname.startsWith("/incidents")) {
    return {
      title: "Анализ инцидентов",
      description: "Динамика, контекст, подтверждающие данные и рекомендуемые действия.",
      breadcrumb: "Инциденты"
    };
  }
  return {
    title: "Панель разбора инцидентов",
    description: "MVP для incident response: автоматическая сводка, гипотеза причины, связь с развертыванием и объяснение выводов.",
    breadcrumb: "Панель управления"
  };
}

export function AppShell() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const meta = pageMeta(pathname);

  return (
    <div className="app-shell">
      <SoftGradientBackground variant="app" intensity="subtle" />
      <aside className="side-nav">
        <BrandLogo to="/dashboard" variant="markWithText" className="side-nav__brand" label="Открыть панель управления" />

        <nav className="nav-list" aria-label="Основная навигация">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user__avatar">
            <UserCircle size={18} />
          </div>
          <div>
            <strong>{session?.name ?? "Тестовый пользователь"}</strong>
            <span>{session?.email}</span>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="mock-callout compact">
            <Shield size={16} />
            <span>Тестовый режим: синтетические данные, без production secrets</span>
          </div>
          <button className="sidebar-action" type="button" onClick={() => navigate("/settings")}>
            <Settings size={16} />
            Настройки
          </button>
          <button
            className="sidebar-action danger"
            type="button"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut size={16} />
            Выйти
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="top-bar">
          <div>
            <Breadcrumb items={[{ label: meta.breadcrumb }]} />
            <h1>{meta.title}</h1>
            <p>{meta.description}</p>
          </div>
          <div className="top-bar__actions">
            <AnimatedThemeToggler />
          </div>
        </header>
        <IncidentWorkspaceProvider>
          <Outlet />
        </IncidentWorkspaceProvider>
      </main>
    </div>
  );
}
