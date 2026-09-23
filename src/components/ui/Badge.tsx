import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "neutral";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-[var(--gov-bg)] text-[var(--gov-navy)] border-[var(--gov-border)]",
    success: "bg-green-50 text-green-800 border-green-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    error: "bg-red-50 text-red-800 border-red-200",
    info: "bg-blue-50 text-[var(--gov-navy-light)] border-blue-200",
    neutral: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold border tracking-wide",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
