import { ArrowLeft, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { TEST_EMAIL, TEST_PASSWORD, useAuth } from "@/auth/AuthProvider";
import { BrandLogo } from "@/components/BrandLogo";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Button } from "@/components/ui/button";

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(TEST_EMAIL);
  const [password, setPassword] = useState(TEST_PASSWORD);
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
        <BrandLogo to="/" variant="horizontal" />
        <AnimatedThemeToggler />
      </header>

      <main className="login-card">
        <BrandLogo variant="mark" className="login-card__brand" />
        <div className="login-card__icon">
          <LockKeyhole size={22} />
        </div>
        <h1>Вход в Triage AI</h1>
        <p>Откройте личный кабинет для разбора инцидентов.</p>

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

        <div className="test-credentials">
          <strong>Тестовый доступ</strong>
          <span>Email: {TEST_EMAIL}</span>
          <span>Пароль: {TEST_PASSWORD}</span>
          <small>Это прозрачный тестовый вход. Production security подключается на backend auth/RBAC слое.</small>
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
