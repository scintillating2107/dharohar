"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { CompareRecordsPanel } from "@/components/validation/CompareRecordsPanel";

export default function ComparePage() {
  return (
    <AppLayout title="Historical comparison">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-[var(--gov-navy)] mb-2">Compare land records</h1>
        <p className="text-sm text-[var(--gov-text-muted)] mb-6">
          Side-by-side field comparison across record years — highlights discrepancies for officer review.
        </p>
        <CompareRecordsPanel />
      </div>
    </AppLayout>
  );
}
