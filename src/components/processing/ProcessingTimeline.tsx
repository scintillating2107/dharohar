import type { ProcessingStep } from "@/types";
import { Check, Circle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProcessingTimeline({ steps }: { steps: ProcessingStep[] }) {
  return (
    <div className="space-y-0">
      {steps.map((step, index) => (
        <ProcessingStepItem
          key={step.key}
          step={step}
          isLast={index === steps.length - 1}
        />
      ))}
    </div>
  );
}

function ProcessingStepItem({
  step,
  isLast,
}: {
  step: ProcessingStep;
  isLast: boolean;
}) {
  const icons = {
    completed: <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />,
    in_progress: <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />,
    failed: <X className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />,
    pending: <Circle className="h-2.5 w-2.5 text-[var(--gov-text-light)]" />,
  };

  const bgColors = {
    completed: "bg-[var(--gov-green)] shadow-sm shadow-green-200",
    in_progress: "bg-[var(--gov-navy-light)] shadow-sm shadow-blue-200",
    failed: "bg-red-600 shadow-sm shadow-red-200",
    pending: "bg-[var(--gov-border-light)] border-2 border-[var(--gov-border)]",
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full",
            bgColors[step.status]
          )}
        >
          {icons[step.status]}
        </div>
        {!isLast && (
          <div
            className={cn(
              "w-0.5 flex-1 min-h-[28px]",
              step.status === "completed" ? "bg-[var(--gov-green)]/40" : "bg-[var(--gov-border-light)]"
            )}
          />
        )}
      </div>
      <div className="pb-5 pt-0.5">
        <p
          className={cn(
            "text-sm font-semibold",
            step.status === "pending" ? "text-[var(--gov-text-light)]" : "text-[var(--gov-navy)]"
          )}
        >
          {step.label}
        </p>
        {step.completedAt && (
          <p className="text-xs text-[var(--gov-text-muted)] mt-0.5">
            Completed at {new Date(step.completedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        {step.status === "in_progress" && (
          <p className="text-xs text-[var(--gov-navy-light)] mt-0.5 font-medium">In progress...</p>
        )}
        {step.error && (
          <p className="text-xs text-red-600 mt-0.5 bg-red-50 rounded px-2 py-0.5 inline-block">{step.error}</p>
        )}
      </div>
    </div>
  );
}
