import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  className?: string;
  accent?: "navy" | "green" | "saffron" | "amber" | "blue";
}

const accentColors = {
  navy: "border-l-[var(--gov-navy)] bg-white",
  green: "border-l-[var(--gov-green)] bg-white",
  saffron: "border-l-[var(--gov-saffron)] bg-white",
  amber: "border-l-amber-500 bg-white",
  blue: "border-l-[var(--gov-navy-light)] bg-white",
};

const iconBg = {
  navy: "bg-[var(--gov-navy)]/8 text-[var(--gov-navy)]",
  green: "bg-green-50 text-[var(--gov-green)]",
  saffron: "bg-orange-50 text-[var(--gov-saffron)]",
  amber: "bg-amber-50 text-amber-600",
  blue: "bg-blue-50 text-[var(--gov-navy-light)]",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  accent = "navy",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "gov-card border-l-4 p-5 transition-shadow hover:shadow-md",
        accentColors[accent],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--gov-text-muted)]">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-[var(--gov-navy)] tabular-nums">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-[var(--gov-text-muted)]">{subtitle}</p>
          )}
          {trend && (
            <p className="mt-1 text-xs font-medium text-[var(--gov-green)]">{trend}</p>
          )}
        </div>
        {Icon && (
          <div className={cn("rounded-lg p-2.5 flex-shrink-0", iconBg[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
