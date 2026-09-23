import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    const variants = {
      primary:
        "bg-[var(--gov-navy)] text-white hover:bg-[var(--gov-navy-light)] border border-[var(--gov-navy)] shadow-sm",
      secondary:
        "bg-[var(--gov-bg-subtle)] text-[var(--gov-navy)] hover:bg-[var(--gov-border-light)] border border-[var(--gov-border)]",
      outline:
        "bg-white text-[var(--gov-navy)] hover:bg-[var(--gov-bg-subtle)] border border-[var(--gov-border)]",
      ghost:
        "bg-transparent text-[var(--gov-text-muted)] hover:bg-[var(--gov-bg)] hover:text-[var(--gov-navy)] border border-transparent",
      danger:
        "bg-red-700 text-white hover:bg-red-800 border border-red-700 shadow-sm",
    };
    const sizes = {
      sm: "px-3 py-1.5 text-xs rounded",
      md: "px-4 py-2 text-sm rounded-md",
      lg: "px-6 py-2.5 text-base rounded-md",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gov-navy-light)] focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
