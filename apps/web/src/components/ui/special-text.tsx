import { useInView } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SpecialTextProps = {
  children: string;
  speed?: number;
  delay?: number;
  className?: string;
  inView?: boolean;
  once?: boolean;
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function SpecialText({ children, speed = 28, delay = 140, className, inView, once = true }: SpecialTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInView(ref, { once, margin: "-10% 0px" });
  const reducedMotion = useReducedMotion();
  const shouldRun = inView ?? visible;
  const [value, setValue] = useState(reducedMotion ? children : "");
  const letters = useMemo(() => children.split(""), [children]);

  useEffect(() => {
    if (reducedMotion) {
      setValue(children);
      return;
    }
    if (!shouldRun) return;

    setValue("");
    let index = 0;
    let interval: number | undefined;
    const timeout = window.setTimeout(() => {
      interval = window.setInterval(() => {
        index += 1;
        setValue(letters.slice(0, index).join(""));
        if (index >= letters.length && interval) {
          window.clearInterval(interval);
        }
      }, speed);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      if (interval) window.clearInterval(interval);
    };
  }, [children, delay, letters, reducedMotion, shouldRun, speed]);

  return (
    <span ref={ref} className={cn("special-text", className)} aria-label={children}>
      <span aria-hidden="true">{value || children}</span>
    </span>
  );
}
