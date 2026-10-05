"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { MoveHorizontal } from "lucide-react";

/** Before/after image comparison with a draggable divider (keyboard accessible range input). */
export function CompareSlider({ before, after, beforeLabel, afterLabel }: { before: string; after: string; beforeLabel: string; afterLabel: string }) {
  const { t } = useLocale();
  const [pos, setPos] = useState(50);

  return (
    <div className="relative select-none overflow-hidden rounded-lg border border-[var(--gov-border-light)] bg-[var(--gov-bg-subtle)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={t(afterLabel)} className="block w-full h-auto" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={t(beforeLabel)} className="block w-full h-full object-fill" draggable={false} />
      </div>
      <div className="absolute inset-y-0 pointer-events-none" style={{ left: `${pos}%` }}>
        <div className="h-full w-0.5 -translate-x-1/2 bg-[var(--gov-saffron)] shadow" />
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--gov-saffron)] p-1.5 text-white shadow-lg">
          <MoveHorizontal className="h-4 w-4" />
        </div>
      </div>
      <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">{t(beforeLabel)}</span>
      <span className="absolute right-2 top-2 rounded bg-[var(--gov-green)] px-2 py-0.5 text-xs font-semibold text-white">{t(afterLabel)}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label={t("Drag to compare before and after")}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
