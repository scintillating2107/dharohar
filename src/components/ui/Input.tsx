import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-md border border-[var(--gov-border)] bg-white px-3 py-2.5 text-sm text-[var(--gov-text)]",
        "placeholder:text-[var(--gov-text-light)]",
        "focus:border-[var(--gov-navy-light)] focus:outline-none focus:ring-2 focus:ring-[var(--gov-navy-light)]/20",
        "disabled:bg-[var(--gov-bg-subtle)] disabled:text-[var(--gov-text-muted)]",
        "transition-colors duration-150",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
