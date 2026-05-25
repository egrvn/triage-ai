import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  to?: string;
  variant?: "horizontal" | "mark" | "markWithText";
  className?: string;
  label?: string;
};

export function BrandLogo({ to, variant = "markWithText", className, label = "Triage AI" }: BrandLogoProps) {
  const content = (
    <>
      <img className="brand-logo__mark" src="/brand/triage-ai-v3-mark.svg" alt={variant === "mark" ? label : ""} width="40" height="40" />
      {variant !== "mark" ? (
        <span className="brand-logo__text">
          <strong translate="no">Triage AI</strong>
        </span>
      ) : null}
    </>
  );

  if (to) {
    return (
      <Link className={cn("brand-logo", `brand-logo--${variant}`, className)} to={to} aria-label={label}>
        {content}
      </Link>
    );
  }

  return <span className={cn("brand-logo", `brand-logo--${variant}`, className)}>{content}</span>;
}
