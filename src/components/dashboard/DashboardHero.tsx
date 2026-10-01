import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function DashboardHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  accent = "navy",
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  accent?: "navy" | "saffron" | "green" | "blue";
  actions?: { href: string; label: string; icon?: LucideIcon; variant?: "outline" }[];
}) {
  const accentBorder = {
    navy: "border-l-[var(--gov-navy)]",
    saffron: "border-l-[var(--gov-saffron)]",
    green: "border-l-[var(--gov-green)]",
    blue: "border-l-[var(--gov-navy-light)]",
  }[accent];

  return (
    <div className={`dashboard-hero gov-card border-l-4 ${accentBorder} p-6 sm:p-8`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex gap-4 min-w-0">
          {Icon && (
            <div className="dashboard-hero-icon hidden sm:flex">
              <Icon className="h-7 w-7" />
            </div>
          )}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--gov-text-muted)]">
              {eyebrow}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--gov-navy)] mt-1 tracking-tight">
              {title}
            </h1>
            <p className="text-sm text-[var(--gov-text-muted)] mt-2 max-w-2xl leading-relaxed">
              {description}
            </p>
          </div>
        </div>
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-2 shrink-0">
            {actions.map((action) => {
              const external = action.href.startsWith("http");
              const btn = (
                <Button
                  size="sm"
                  variant={action.variant === "outline" ? "outline" : "primary"}
                >
                  {action.icon && <action.icon className="h-4 w-4" />}
                  {action.label}
                </Button>
              );
              return external ? (
                <a key={action.href} href={action.href} target="_blank" rel="noopener noreferrer">
                  {btn}
                </a>
              ) : (
                <Link key={action.href} href={action.href}>{btn}</Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="gov-section-title">{title}</h2>
          {description && (
            <p className="text-sm text-[var(--gov-text-muted)] mt-2">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
