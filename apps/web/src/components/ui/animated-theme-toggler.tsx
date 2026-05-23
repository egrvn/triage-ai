import { motion } from "motion/react";
import { useEffect, useState } from "react";

const THEME_KEY = "triage-ai-theme";

type ThemeMode = "light" | "dark";

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function AnimatedThemeToggler({ sound = false }: { sound?: boolean }) {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem(THEME_KEY, next);
    window.dispatchEvent(new CustomEvent("triage-ai-theme-change", { detail: next }));

    if (sound) {
      const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=");
      void audio.play().catch(() => undefined);
    }
  };

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label="Переключить тему"
      aria-pressed={theme === "dark"}
      onClick={toggleTheme}
      disabled={!mounted}
    >
      <motion.span
        className="theme-toggle__orb"
        animate={{ x: theme === "dark" ? 22 : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
      />
      <span className="theme-toggle__sun" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
        </svg>
      </span>
      <span className="theme-toggle__moon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M20 15.5A8.3 8.3 0 0 1 8.5 4 8.8 8.8 0 1 0 20 15.5Z" />
        </svg>
      </span>
    </button>
  );
}
