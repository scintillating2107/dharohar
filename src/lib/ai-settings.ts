import {
  HIGH_CONFIDENCE_THRESHOLD,
  MEDIUM_CONFIDENCE_THRESHOLD,
} from "@/lib/config";

const STORAGE_KEY = "dharohar_ai_settings";

export interface AiSettings {
  autoApprovePercent: number;
  humanReviewLowPercent: number;
}

const DEFAULTS: AiSettings = {
  autoApprovePercent: 95,
  humanReviewLowPercent: 70,
};

export function loadAiSettings(): AiSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveAiSettings(settings: AiSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function confidenceThresholdsFromSettings(settings?: AiSettings) {
  const s = settings ?? loadAiSettings();
  return {
    high: s.autoApprovePercent / 100,
    medium: s.humanReviewLowPercent / 100,
  };
}

export function getConfidenceLevelWithSettings(
  confidence: number,
  settings?: AiSettings
): "high" | "medium" | "low" {
  const t = confidenceThresholdsFromSettings(settings);
  if (confidence >= t.high) return "high";
  if (confidence >= t.medium) return "medium";
  return "low";
}

/** Server-safe defaults from config */
export function defaultConfidenceLevel(confidence: number): "high" | "medium" | "low" {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return "high";
  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) return "medium";
  return "low";
}
