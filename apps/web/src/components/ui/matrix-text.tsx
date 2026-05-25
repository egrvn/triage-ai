import { useEffect, useMemo, useState } from "react";

const symbols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#:/._-";

type MatrixTextProps = {
  text: string;
  className?: string;
};

export function MatrixText({ text, className }: MatrixTextProps) {
  const [frame, setFrame] = useState(text);
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setFrame(text);
      return undefined;
    }

    let tick = 0;
    const interval = window.setInterval(() => {
      tick += 1;
      setFrame(text.split("").map((char, index) => {
        if (char === " ") return " ";
        if (index < tick - 2) return char;
        return symbols[(index + tick) % symbols.length] ?? char;
      }).join(""));

      if (tick > text.length + 2) {
        window.clearInterval(interval);
        setFrame(text);
      }
    }, 70);

    return () => window.clearInterval(interval);
  }, [prefersReducedMotion, text]);

  return <span className={className ? `matrix-text ${className}` : "matrix-text"}>{frame}</span>;
}
