import type { CSSProperties, ComponentProps } from "react";
import { cn } from "@/lib/utils";

type FallingPatternBackgroundProps = ComponentProps<"div"> & {
  intensity?: "subtle" | "normal" | "strong";
  density?: number;
  duration?: number;
};

const glyphs = ["alert", "log", "metric", "deploy", "AI", "SLO", "503", "trace"];

export function FallingPatternBackground({
  className,
  intensity = "normal",
  density = 18,
  duration = 22,
  ...props
}: FallingPatternBackgroundProps) {
  const count = Math.max(8, Math.min(density, 34));
  return (
    <div
      aria-hidden="true"
      className={cn("falling-pattern-background", `falling-pattern-background--${intensity}`, className)}
      {...props}
    >
      {Array.from({ length: count }, (_, index) => {
        const style = {
          "--fall-x": `${(index * 37) % 100}%`,
          "--fall-delay": `${-(index * 1.7) % duration}s`,
          "--fall-duration": `${duration + (index % 7) * 2}s`,
          "--fall-size": `${0.72 + (index % 5) * 0.08}rem`
        } as CSSProperties;

        return (
          <span key={index} className="falling-pattern-background__item" style={style}>
            {glyphs[index % glyphs.length]}
          </span>
        );
      })}
    </div>
  );
}
