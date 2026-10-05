import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { settings } from "@/server/db/schema";
import type { SystemSettings } from "@/types";

export const DEFAULT_SETTINGS: SystemSettings = {
  reviewThreshold: 0.8,
  highPriorityThreshold: 0.7,
  autoApproveEnabled: false,
  autoApproveThreshold: 0.97,
  makerChecker: false,
  areaTolerancePct: 10,
  learningEnabled: true,
};

const KEY = "system";

function clamp01(n: unknown, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(1, Math.max(0, v));
}

export function sanitizeSettings(input: Partial<SystemSettings>, base = DEFAULT_SETTINGS): SystemSettings {
  return {
    reviewThreshold: clamp01(input.reviewThreshold ?? base.reviewThreshold, base.reviewThreshold),
    highPriorityThreshold: clamp01(
      input.highPriorityThreshold ?? base.highPriorityThreshold,
      base.highPriorityThreshold
    ),
    autoApproveEnabled: Boolean(input.autoApproveEnabled ?? base.autoApproveEnabled),
    autoApproveThreshold: clamp01(
      input.autoApproveThreshold ?? base.autoApproveThreshold,
      base.autoApproveThreshold
    ),
    makerChecker: Boolean(input.makerChecker ?? base.makerChecker),
    areaTolerancePct: Math.min(
      100,
      Math.max(0, Number(input.areaTolerancePct ?? base.areaTolerancePct) || base.areaTolerancePct)
    ),
    learningEnabled: Boolean(input.learningEnabled ?? base.learningEnabled),
  };
}

export async function getSettings(): Promise<SystemSettings> {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY));
  if (!row) return DEFAULT_SETTINGS;
  return sanitizeSettings(row.value as Partial<SystemSettings>);
}

export async function updateSettings(patch: Partial<SystemSettings>, userId: string): Promise<SystemSettings> {
  const db = await getDb();
  const next = sanitizeSettings(patch, await getSettings());
  await db
    .insert(settings)
    .values({ key: KEY, value: next, updatedBy: userId })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: next, updatedAt: new Date().toISOString(), updatedBy: userId },
    });
  return next;
}
