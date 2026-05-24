import { ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { BGPattern } from "@/components/ui/bg-pattern";
import { Button } from "@/components/ui/button";

const marketingLinks = [
  { label: "Возможности", href: "/#features" },
  { label: "Как работает", href: "/#how-it-works" },
  { label: "Сценарии", href: "/#scenarios" },
  { label: "Документация", href: "/docs" }
];

const productLinks = [
  { label: "Панель управления", href: "/dashboard" },
  { label: "Инциденты", href: "/incidents" },
  { label: "Интеграции", href: "/integrations" },
  { label: "Настройки", href: "/settings" }
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <BGPattern className="site-footer__pattern" variant="dots" mask="fade-y" size={20} />
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <BrandLogo variant="markWithText" />
          <span className="status-badge">Тестовый режим</span>
          <p>
            MVP-консоль для быстрого разбора инцидентов, проверки гипотез и передачи контекста между
            дежурным инженером и эскалацией.
          </p>
        </div>

        <nav className="site-footer__group" aria-label="Разделы лендинга">
          <strong>Сайт</strong>
          {marketingLinks.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
        </nav>

        <nav className="site-footer__group" aria-label="Разделы продукта">
          <strong>Продукт</strong>
          {productLinks.map((link) => <Link key={link.href} to={link.href}>{link.label}</Link>)}
        </nav>

        <div className="site-footer__cta">
          <Button asChild>
            <Link to="/login">Войти в кабинет</Link>
          </Button>
          <Button type="button" variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <ArrowUp size={16} />
            Наверх
          </Button>
        </div>
      </div>

      <div className="site-footer__bottom">
        <span>© 2026 Triage AI. Все права защищены.</span>
        <span>Тестовый режим. Синтетические данные. Без реальных secrets.</span>
        <Link to="/docs">Документация</Link>
      </div>
    </footer>
  );
}
