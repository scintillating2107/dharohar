"use client";

import { DEMO_TIMELINE, demoStepToTimeline } from "@/lib/demo-workflow";
import { cn } from "@/lib/utils";

export function DemoTimelineBar({ stepIndex }: { stepIndex: number }) {
  const active = demoStepToTimeline(stepIndex);

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex items-center min-w-[640px] gap-0">
        {DEMO_TIMELINE.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "h-3 w-3 rounded-full border-2 transition-all",
                  i < active && "bg-[var(--gov-green)] border-[var(--gov-green)]",
                  i === active && "bg-[var(--gov-saffron)] border-[var(--gov-saffron)] scale-125",
                  i > active && "bg-white border-[var(--gov-border)]"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-bold tracking-wide",
                  i === active ? "text-[var(--gov-navy)]" : "text-[var(--gov-text-muted)]"
                )}
              >
                {label}
              </span>
            </div>
            {i < DEMO_TIMELINE.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-1 min-w-[24px]",
                  i < active ? "bg-[var(--gov-green)]" : "bg-[var(--gov-border-light)]"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
