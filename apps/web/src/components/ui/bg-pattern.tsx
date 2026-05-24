import type { CSSProperties, ComponentProps } from "react";
import { cn } from "@/lib/utils";

type BGPatternVariant = "dots" | "diagonal-stripes" | "grid" | "horizontal-lines" | "vertical-lines" | "checkerboard";
type BGPatternMask = "fade-center" | "fade-edges" | "fade-top" | "fade-bottom" | "fade-left" | "fade-right" | "fade-x" | "fade-y" | "none";

type BGPatternProps = ComponentProps<"div"> & {
  variant?: BGPatternVariant;
  mask?: BGPatternMask;
  size?: number;
  fill?: string;
};

const maskMap: Record<BGPatternMask, string> = {
  "fade-center": "radial-gradient(circle at center, black 0%, black 42%, transparent 74%)",
  "fade-edges": "radial-gradient(circle at center, black 0%, black 56%, transparent 86%)",
  "fade-top": "linear-gradient(to bottom, transparent 0%, black 36%, black 100%)",
  "fade-bottom": "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
  "fade-left": "linear-gradient(to right, transparent 0%, black 34%, black 100%)",
  "fade-right": "linear-gradient(to right, black 0%, black 58%, transparent 100%)",
  "fade-x": "linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)",
  "fade-y": "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
  none: "none"
};

function getBgImage(variant: BGPatternVariant, fill: string, size: number) {
  const half = size / 2;

  if (variant === "dots") {
    return `radial-gradient(circle at ${half}px ${half}px, ${fill} 1.2px, transparent 1.6px)`;
  }
  if (variant === "grid") {
    return `linear-gradient(${fill} 1px, transparent 1px), linear-gradient(90deg, ${fill} 1px, transparent 1px)`;
  }
  if (variant === "diagonal-stripes") {
    return `repeating-linear-gradient(135deg, ${fill} 0 1px, transparent 1px ${size}px)`;
  }
  if (variant === "horizontal-lines") {
    return `repeating-linear-gradient(0deg, ${fill} 0 1px, transparent 1px ${size}px)`;
  }
  if (variant === "vertical-lines") {
    return `repeating-linear-gradient(90deg, ${fill} 0 1px, transparent 1px ${size}px)`;
  }
  return `linear-gradient(45deg, ${fill} 25%, transparent 25%, transparent 75%, ${fill} 75%), linear-gradient(45deg, ${fill} 25%, transparent 25%, transparent 75%, ${fill} 75%)`;
}

export function BGPattern({
  variant = "dots",
  mask = "fade-edges",
  size = 22,
  fill = "color-mix(in srgb, var(--chart-1) 36%, transparent)",
  className,
  style,
  ...props
}: BGPatternProps) {
  const patternStyle = {
    "--bg-pattern-size": `${size}px`,
    "--bg-pattern-fill": fill,
    backgroundImage: getBgImage(variant, fill, size),
    backgroundSize: variant === "checkerboard" ? `${size}px ${size}px` : `${size}px ${size}px`,
    backgroundPosition: variant === "checkerboard" ? `0 0, ${size / 2}px ${size / 2}px` : undefined,
    maskImage: mask === "none" ? undefined : maskMap[mask],
    WebkitMaskImage: mask === "none" ? undefined : maskMap[mask],
    ...style
  } as CSSProperties;

  return <div aria-hidden="true" className={cn("bg-pattern", className)} style={patternStyle} {...props} />;
}
