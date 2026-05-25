import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Возможности", href: "/#features" },
  { label: "Как работает", href: "/#how-it-works" },
  { label: "Сценарии", href: "/#scenarios" },
  { label: "Документация", href: "/docs" }
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    document.body.classList.toggle("menu-open", open);
    return () => document.body.classList.remove("menu-open");
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="site-header">
      <BrandLogo to="/" variant="horizontal" className="site-header__brand" />

      <nav className="site-header__nav" aria-label="Навигация лендинга">
        {navLinks.map((link) => (
          <a key={link.href} href={link.href}>{link.label}</a>
        ))}
      </nav>

      <div className="site-header__actions">
        <AnimatedThemeToggler sound={false} />
        <Button asChild variant="ghost">
          <Link to="/login">Войти</Link>
        </Button>
        <Button asChild>
          <Link to="/login">В кабинет</Link>
        </Button>
        <button
          className="site-header__menu"
          type="button"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open ? (
        <div className="site-header__mobile" id="mobile-menu">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>
          ))}
          <Button asChild>
            <Link to="/login">Войти в кабинет</Link>
          </Button>
        </div>
      ) : null}
    </header>
  );
}
