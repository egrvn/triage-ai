import type { ComponentProps } from "react";
import { BGPattern } from "@/components/ui/bg-pattern";
import { cn } from "@/lib/utils";

type SoftGradientBackgroundProps = ComponentProps<"div"> & {
  variant?: "center" | "top" | "corner" | "section" | "app";
  intensity?: "subtle" | "normal" | "strong";
  pattern?: boolean;
};

export function SoftGradientBackground({
  className,
  variant = "center",
  intensity = "subtle",
  pattern = true,
  ...props
}: SoftGradientBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "soft-gradient-background",
        `soft-gradient-background--${variant}`,
        `soft-gradient-background--${intensity}`,
        className
      )}
      {...props}
    >
      <div className="soft-gradient-background__glow" />
      {pattern ? (
        <BGPattern
          className="soft-gradient-background__pattern"
          variant={variant === "section" ? "grid" : "dots"}
          mask={variant === "corner" ? "fade-left" : "fade-y"}
          size={variant === "app" ? 26 : 22}
          fill="color-mix(in srgb, var(--primary) 24%, transparent)"
        />
      ) : null}
    </div>
  );
}
