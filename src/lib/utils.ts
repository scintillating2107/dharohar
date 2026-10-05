import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { HIGH_CONFIDENCE_THRESHOLD, MEDIUM_CONFIDENCE_THRESHOLD, FIELD_LABELS } from "./config";
import { intlLocale, translate, getCurrentLocale } from "./i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Number in the active locale (Indian grouping). */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat(intlLocale()).format(n);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat(intlLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat(intlLocale(), { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

export function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return "";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export type ConfidenceLevel = "high" | "medium" | "low";

/** `reviewThreshold` comes from server settings; fields below it need officer review. */
export function getConfidenceLevel(confidence: number, reviewThreshold = MEDIUM_CONFIDENCE_THRESHOLD): ConfidenceLevel {
  if (confidence >= Math.max(HIGH_CONFIDENCE_THRESHOLD, reviewThreshold)) return "high";
  if (confidence >= reviewThreshold) return "medium";
  return "low";
}

export function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatRole(role: string): string {
  return role.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatArea(value: number | undefined | null, unit?: string | null, hectares?: number | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  const base = `${value} ${unit ? translate(getCurrentLocale(), unit) : ""}`.trim();
  if (hectares !== undefined && hectares !== null && unit && unit !== "hectare") return `${base} (${hectares.toFixed(4)} ha)`;
  return base;
}

export function generateId(prefix: string): string {
  return `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}
