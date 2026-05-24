import { Children, cloneElement, isValidElement } from "react";
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ShinyButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  asChild?: boolean;
  variant?: "primary" | "dark" | "subtle";
  size?: "sm" | "md" | "lg";
};

export function ShinyButton({
  children,
  asChild = false,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ShinyButtonProps) {
  const classes = cn("shiny-button", `shiny-button--${variant}`, `shiny-button--${size}`, className);
  const renderContent = (value: ReactNode) => (
    <>
      <span className="shiny-button__shine" aria-hidden="true" />
      <span className="shiny-button__content">{value}</span>
    </>
  );

  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement(child)) return null;
    const element = child as ReactElement<{ className?: string; children?: ReactNode }>;

    return cloneElement(element, {
      className: cn(classes, element.props.className),
      children: renderContent(element.props.children)
    });
  }

  return (
    <button type={type} className={classes} {...props}>
      {renderContent(children)}
    </button>
  );
}
