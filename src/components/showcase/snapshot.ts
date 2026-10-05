"use client";

import { createContext, useContext } from "react";
import type { RecordDetail } from "@/components/records/Record360";
import type { CertificateCheckResult } from "@/components/records/CertificatePanel";
import type { SystemSettings } from "@/types";

/**
 * A processed record exported from a running system (scripts/export-demo-snapshot.mjs), used by
 * the public walkthrough so the demo works without a database or sign-in.
 */
export interface ShowcaseSnapshot {
  exportedAt: string;
  recordId: string;
  detail: RecordDetail;
  certificate: CertificateCheckResult | null;
  chain: { valid: boolean; checked: number; brokenAtSeq?: number; head: string | null };
  settings: SystemSettings;
  qr: string | null;
}

/** Present when the showcase renders from a snapshot: live-only actions are hidden. */
export const SnapshotContext = createContext<ShowcaseSnapshot | null>(null);

export function useSnapshot(): ShowcaseSnapshot | null {
  return useContext(SnapshotContext);
}
