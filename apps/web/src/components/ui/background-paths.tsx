import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type BackgroundPathsProps = {
  title?: string;
  subtitle?: string;
  primaryTo?: string;
  secondaryHref?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
};

const paths = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  d: `M ${-80 + index * 54} ${90 + (index % 4) * 34} C ${130 + index * 18} ${-20 + index * 8}, ${270 + index * 38} ${250 + (index % 5) * 20}, ${780 + index * 42} ${90 + (index % 3) * 80}`,
  delay: index * 0.08,
  width: 0.7 + (index % 4) * 0.22
}));

export function BackgroundPaths({
  title = "AI-консоль для triage инцидентов",
  subtitle = "Связывайте Alerts, Logs, Metrics и Deployments в одном Dashboard для быстрого incident response.",
  primaryTo = "/login",
  secondaryHref = "#demo-scenarios",
  primaryLabel = "Войти в кабинет",
  secondaryLabel = "Посмотреть demo"
}: BackgroundPathsProps) {
  return (
    <section className="background-paths">
      <div className="background-paths__canvas" aria-hidden="true">
        <svg viewBox="0 0 1200 520" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pathGradient" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="45%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
          </defs>
          {paths.map((path) => (
            <motion.path
              key={path.id}
              d={path.d}
              fill="none"
              stroke="url(#pathGradient)"
              strokeLinecap="round"
              strokeWidth={path.width}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.45, 0.2] }}
              transition={{
                duration: 4.8,
                delay: path.delay,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
            />
          ))}
        </svg>
      </div>
      <div className="background-paths__content">
        <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          {title}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }}>
          {subtitle}
        </motion.p>
        <motion.div className="background-paths__actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.16 }}>
          <Button asChild size="lg">
            <Link to={primaryTo}>{primaryLabel}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={secondaryHref}>{secondaryLabel}</a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
