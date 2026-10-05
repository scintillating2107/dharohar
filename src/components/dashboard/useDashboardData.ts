"use client";

import { useApi } from "@/lib/use-api";
import type { DashboardStats, DistrictProgress, ProcessingStatus, StateProgress, ValidationWarning } from "@/types";

export interface AttentionItem {
  id: string;
  title: string;
  detail?: string;
  href: string;
  severity: "high" | "medium" | "info";
}

export interface DashboardData {
  stats: DashboardStats;
  stateProgress: StateProgress[];
  districtProgress: DistrictProgress[];
  processingChart: { month: string; uploaded: number; processed: number; verified: number }[];
  dailyTrend: { day: string; date?: string; uploaded: number; verified: number }[];
  verificationChart: { name: string; value: number; color: string }[];
  validationChart: { name: string; value: number; color: string }[];
  recentDocuments: { id: string; name: string; status: ProcessingStatus; uploadedAt: string; uploadedBy: string; district?: string }[];
  recentVerification: { id: string; recordId: string; ownerName: string; action: string; priority: string; timestamp: string }[];
  recentValidationIssues: { recordId: string; ownerName: string; score: number; warnings: ValidationWarning[] }[];
  errorCategories: { type: string; name: string; count: number }[];
  attention: { items: AttentionItem[]; oldestPendingHours: number | null; unsurveyedVerified: number | null };
}

export function useDashboardData() {
  const { data, error, initialLoading, reload } = useApi<DashboardData>("/api/dashboard", { pollMs: 60000 });
  return { data: data ?? null, loading: initialLoading, error, reload };
}
