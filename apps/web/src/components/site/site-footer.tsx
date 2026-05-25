import { ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { FallingPatternBackground } from "@/components/ui/falling-pattern-background";

const marketingLinks = [
  { label: "Возможности", href: "/#features" },
  { label: "Как работает", href: "/#how-it-works" },
  { label: "Сценарии", href: "/#scenarios" },
  { label: "Incident Workspace", href: "/#workspace" }
];

const productLinks = [
  { label: "Панель управления", href: "/dashboard" },
  { label: "Инциденты", href: "/incidents" },
  { label: "Интеграции", href: "/integrations" },
  { label: "Настройки", href: "/settings" }
];

const docsLinks = [
  { label: "Документация", href: "/docs" },
  { label: "Сценарий продукта", href: "/docs#demo-script" },
  { label: "Метрики пилота", href: "/docs#pilot-metrics" }
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <FallingPatternBackground className="site-footer__pattern" intensity="subtle" density={12} duration={30} />
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <BrandLogo variant="markWithText" />
          <span className="status-badge">Тестовый режим</span>
          <p>
            Консоль для быстрого разбора инцидентов, проверки гипотез и передачи контекста между
            дежурным инженером и эскалацией.
          </p>
        </div>

        <nav className="site-footer__group" aria-label="Разделы лендинга">
          <strong>Возможности</strong>
          {marketingLinks.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
        </nav>

        <nav className="site-footer__group" aria-label="Разделы продукта">
          <strong>Консоль</strong>
          {productLinks.map((link) => <Link key={link.href} to={link.href}>{link.label}</Link>)}
        </nav>

        <nav className="site-footer__group" aria-label="Документация продукта">
          <strong>Справка</strong>
          {docsLinks.map((link) => <Link key={link.href} to={link.href}>{link.label}</Link>)}
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
