import {
  Activity,
  BookOpenText,
  Bot,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Map,
  Plug,
  Settings,
  UserCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { BrandLogo } from "@/components/BrandLogo";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { IncidentWorkspaceProvider } from "@/features/incidents/incident-workspace";
import { api } from "@/lib/api";

const navGroups = [
  {
    label: "Работа",
    items: [
      { to: "/dashboard", label: "Панель управления", icon: LayoutDashboard },
      { to: "/incidents", label: "Инциденты", icon: Activity },
      { to: "/assistant", label: "AI-ассистент", icon: Bot },
      { to: "/integrations", label: "Интеграции", icon: Plug }
    ]
  },
  {
    label: "Справка",
    items: [
      { to: "/app/docs", label: "Документация", icon: BookOpenText },
      { to: "/roadmap", label: "Roadmap", icon: Map }
    ]
  },
  {
    label: "Параметры",
    items: [
      { to: "/settings", label: "Настройки", icon: Settings }
    ]
  }
];

function pageMeta(pathname: string) {
  if (/^\/incidents\/[^/]+/.test(pathname)) {
    return {
      title: "Рабочая область инцидента",
      description: "AI-сводка, объяснение выводов, подтверждающие данные, хронология и действия по выбранному инциденту.",
      breadcrumb: "Инциденты"
    };
  }
  if (pathname.startsWith("/integrations")) {
    return {
      title: "Интеграции",
      description: "Источники сигналов и каналы уведомлений в тестовом режиме без реальных secrets.",
      breadcrumb: "Интеграции"
    };
  }
  if (pathname.startsWith("/assistant")) {
    return {
      title: "AI-ассистент",
      description: "Рабочее окно для вопросов по выбранному инциденту, citations и handoff-сводкам.",
      breadcrumb: "AI-ассистент"
    };
  }
  if (pathname.startsWith("/settings")) {
    return {
      title: "Настройки",
      description: "Профиль тестового пользователя, роль по умолчанию, тема и статус тестового режима.",
      breadcrumb: "Настройки"
    };
  }
  if (pathname.startsWith("/roadmap")) {
    return {
      title: "Roadmap продукта",
      description: "Что нужно сделать дальше, чтобы Triage AI был готов к production-использованию.",
      breadcrumb: "Roadmap"
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
    description: "Консоль incident response: сводка, гипотеза причины, связь с развертыванием и объяснение выводов.",
    breadcrumb: "Панель управления"
  };
}

export function AppShell() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const meta = pageMeta(pathname);
  const incidentsQuery = useQuery({ queryKey: ["incidents"], queryFn: api.incidents });
  const incidents = incidentsQuery.data ?? [];
  const incidentCounts = {
    inProgress: incidents.filter((incident) => incident.status === "in_progress").length,
    escalated: incidents.filter((incident) => incident.status === "escalated").length,
    closed: incidents.filter((incident) => incident.status === "closed").length
  };

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <BrandLogo to="/dashboard" variant="markWithText" className="side-nav__brand" label="Открыть панель управления" />

        <div className="sidebar-scroll-area">
          <nav className="nav-list" aria-label="Основная навигация">
            {navGroups.map((group) => (
              <div key={group.label} className="nav-group">
                <span>{group.label}</span>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
                      <Icon size={18} aria-hidden="true" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="sidebar-status-counters" aria-label="Очереди инцидентов">
            <NavLink to="/incidents?mode=on-call" className="sidebar-status-counter">
              <span>В работе</span>
              <strong className="sidebar-counter-badge sidebar-counter-badge--warning">{incidentCounts.inProgress}</strong>
            </NavLink>
            <NavLink to="/incidents?mode=escalation" className="sidebar-status-counter">
              <span>Эскалация</span>
              <strong className="sidebar-counter-badge sidebar-counter-badge--danger">{incidentCounts.escalated}</strong>
            </NavLink>
            <NavLink to="/incidents" className="sidebar-status-counter muted">
              <span>Закрытые</span>
              <strong className="sidebar-counter-badge sidebar-counter-badge--muted">{incidentCounts.closed}</strong>
            </NavLink>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user__avatar">
              <UserCircle size={18} />
            </div>
            <div>
              <strong>{session?.name ?? "Тестовый пользователь"}</strong>
              <span>{session?.email}</span>
            </div>
          </div>
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
            <span className="top-bar__mode">
              <FlaskConical size={14} aria-hidden="true" />
              Тестовый режим
            </span>
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
