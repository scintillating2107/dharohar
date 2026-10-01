"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  DEMO_LAND_RECORD_AFTER,
  DEMO_LAND_RECORD_BEFORE,
} from "@/lib/demo-assets";

const FRAME_CLASS =
  "relative w-full h-[clamp(160px,32vh,300px)] rounded-lg overflow-hidden bg-slate-100";

export function LandRecordImagePair({
  beforeClassName,
  afterClassName,
  showAfter = true,
  labelBefore = "Before — faded scan",
  labelAfter = "After — enhanced",
  compact,
}: {
  beforeClassName?: string;
  afterClassName?: string;
  showAfter?: boolean;
  labelBefore?: string;
  labelAfter?: string;
  /** Shorter frames for tight layouts */
  compact?: boolean;
}) {
  const frame = compact
    ? "relative w-full h-[clamp(140px,28vh,240px)] rounded-lg overflow-hidden bg-slate-100"
    : FRAME_CLASS;

  return (
    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 min-h-0">
      <div className="min-w-0 flex flex-col">
        <p className="text-xs sm:text-sm font-semibold text-[var(--gov-navy)] mb-1.5 line-clamp-2">{labelBefore}</p>
        <div className={cn(frame, "border-2 border-[var(--gov-border)] shadow-inner", beforeClassName)}>
          <Image
            src={DEMO_LAND_RECORD_BEFORE}
            alt="Land record scan before image enhancement"
            fill
            className="object-contain object-center p-1"
            sizes="(max-width: 640px) 100vw, 50vw"
            priority
          />
        </div>
      </div>
      {showAfter && (
        <div className="min-w-0 flex flex-col">
          <p className="text-xs sm:text-sm font-semibold text-[var(--gov-navy)] mb-1.5 line-clamp-2">{labelAfter}</p>
          <div className={cn(frame, "border border-[var(--gov-green)]/40 bg-white shadow-sm", afterClassName)}>
            <Image
              src={DEMO_LAND_RECORD_AFTER}
              alt="Land record after image enhancement"
              fill
              className="object-contain object-center p-1"
              sizes="(max-width: 640px) 100vw, 50vw"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}
