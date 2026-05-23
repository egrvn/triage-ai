import { ArrowLeft, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { DEMO_EMAIL, DEMO_PASSWORD, useAuth } from "@/auth/AuthProvider";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Button } from "@/components/ui/button";

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    const from = typeof location.state === "object" && location.state && "from" in location.state
      ? String(location.state.from)
      : "/dashboard";
    navigate(from === "/" || from === "/login" ? "/dashboard" : from, { replace: true });
  };

  return (
    <div className="login-page">
      <header className="login-page__header">
        <Link className="brand-block" to="/">
          <div className="brand-mark">T</div>
          <div>
            <strong>Triage AI</strong>
            <span>DevOps Control Center</span>
          </div>
        </Link>
        <AnimatedThemeToggler />
      </header>

      <main className="login-card">
        <div className="login-card__icon">
          <LockKeyhole size={22} />
        </div>
        <h1>Вход в Triage AI</h1>
        <p>Откройте личный кабинет для анализа инцидентов.</p>

        <form onSubmit={submit} className="form-stack">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </label>
          <label>
            Пароль
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>

          {error ? <div className="form-error" role="alert">{error}</div> : null}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Проверяем..." : "Войти"}
          </Button>
        </form>

        <div className="demo-credentials">
          <strong>Demo-доступ</strong>
          <span>Email: {DEMO_EMAIL}</span>
          <span>Пароль: {DEMO_PASSWORD}</span>
          <small>Это mock auth для MVP. Production security здесь не имитируется.</small>
        </div>

        <Button asChild variant="ghost">
          <Link to="/">
            <ArrowLeft size={16} />
            Вернуться на главную
          </Link>
        </Button>
      </main>
    </div>
  );
}
