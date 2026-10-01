"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import type { DashboardStats, RecentDocument } from "@/types";

export interface DashboardData {
  stats: DashboardStats;
  stateProgress: { state: string; percentage: number; verified: number; total: number }[];
  districtProgress: { district: string; state: string; percentage: number }[];
  processingChart: { month: string; uploaded: number; processed: number; verified: number }[];
  verificationChart: { name: string; value: number; color: string }[];
  validationChart: { name: string; value: number; color: string }[];
  recentDocuments: RecentDocument[];
  recentVerification: { recordId: string; ownerName: string; action: string; timestamp: string }[];
  recentValidationIssues: { recordId: string; ownerName: string; score: number }[];
  errorCategories?: { name: string; count: number }[];
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<DashboardData>("/api/dashboard");
      setData(result);
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
