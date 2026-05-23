import {
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
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/integrations", label: "Интеграции", icon: Boxes },
  { to: "/docs", label: "Документация", icon: BookOpenText },
  { to: "/settings", label: "Настройки", icon: Settings }
];

function pageMeta(pathname: string) {
  if (pathname.startsWith("/integrations")) {
    return {
      title: "Интеграции",
      description: "Границы адаптеров видны: mock mode позволяет запускать demo без secrets."
    };
  }
  if (pathname.startsWith("/docs")) {
    return {
      title: "Документация",
      description: "Как читать AI summary, evidence, confidence и demo scenarios."
    };
  }
  if (pathname.startsWith("/settings")) {
    return {
      title: "Настройки",
      description: "Demo user, role defaults, theme и mock mode status."
    };
  }
  return {
    title: "Консоль triage инцидентов",
    description: "MVP для incident response: auto-summary, root-cause hypothesis, deploy correlation и explainability."
  };
}

export function AppShell() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const meta = pageMeta(pathname);

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <NavLink className="brand-block" to="/dashboard" aria-label="Открыть Dashboard">
          <div className="brand-mark">T</div>
          <div>
            <strong>Triage AI</strong>
            <span>Cloud.ru MVP</span>
          </div>
        </NavLink>

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
            <strong>{session?.name ?? "Demo user"}</strong>
            <span>{session?.email}</span>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="mock-callout compact">
            <Shield size={16} />
            <span>mock mode: synthetic data, без production secrets</span>
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
            <h1>{meta.title}</h1>
            <p>{meta.description}</p>
          </div>
          <div className="top-bar__actions">
            <AnimatedThemeToggler />
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
