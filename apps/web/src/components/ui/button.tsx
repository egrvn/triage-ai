import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva("ui-button", {
  variants: {
    variant: {
      default: "ui-button--default",
      destructive: "ui-button--destructive",
      outline: "ui-button--outline",
      secondary: "ui-button--secondary",
      ghost: "ui-button--ghost",
      link: "ui-button--link"
    },
    size: {
      default: "ui-button--size-default",
      sm: "ui-button--size-sm",
      lg: "ui-button--size-lg",
      icon: "ui-button--size-icon"
    }
  },
  defaultVariants: {
    variant: "default",
    size: "default"
  }
});

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
