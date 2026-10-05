"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { MoveHorizontal } from "lucide-react";

/** Before/after image comparison with a draggable divider (keyboard accessible range input). */
export function CompareSlider({ before, after, beforeLabel, afterLabel }: { before: string; after: string; beforeLabel: string; afterLabel: string }) {
  const { t } = useLocale();
  const [pos, setPos] = useState(100);
  const touched = useRef(false);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setPos(50));
      return () => cancelAnimationFrame(id);
    }
    // 100 → 8 → 50: reveal the enhanced page, then settle in the middle
    const keyframes = [100, 8, 50];
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (touched.current) return;
      const tSec = (now - start) / 1000 - 0.6;
      if (tSec < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const seg = Math.min(1.999, tSec / 1.4);
      const i = Math.floor(seg);
      const f = seg - i;
      const eased = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      setPos(keyframes[i] + (keyframes[i + 1] - keyframes[i]) * eased);
      if (tSec < 2.8) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

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
        onChange={(e) => {
          touched.current = true;
          setPos(Number(e.target.value));
        }}
        aria-label={t("Drag to compare before and after")}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
