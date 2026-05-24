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
      {variant === "horizontal" ? (
        <span className="brand-logo__picture">
          <img
            className="brand-logo__horizontal brand-logo__horizontal--light"
            src="/brand/triage-ai-logo-horizontal.svg"
            alt={label}
            width="148"
            height="40"
            fetchPriority="high"
          />
          <img
            className="brand-logo__horizontal brand-logo__horizontal--dark"
            src="/brand/triage-ai-logo-horizontal-light.svg"
            alt=""
            width="148"
            height="40"
            fetchPriority="high"
          />
        </span>
      ) : (
        <img className="brand-logo__mark" src="/brand/triage-ai-mark.svg" alt={variant === "mark" ? label : ""} width="40" height="40" />
      )}
      {variant === "markWithText" ? (
        <span className="brand-logo__text">
          <strong translate="no">Triage AI</strong>
          <span>разбор инцидентов</span>
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
