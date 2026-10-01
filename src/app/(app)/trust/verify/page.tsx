"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Check } from "lucide-react";

function VerifyContent() {
  const params = useSearchParams();
  const record = params.get("record") || "LR-2026-001245";

  const checks = [
    "Document hash matches",
    "Record has not changed",
    "Certification timestamp valid",
    "Verification status: certified",
  ];

  return (
    <AppLayout title="Certificate verification">
      <div className="max-w-lg mx-auto space-y-6">
        <Card title={`Record ${record}`}>
          <ul className="space-y-3">
            {checks.map((c) => (
              <li key={c} className="flex items-center gap-2 text-sm text-[var(--gov-navy)]">
                <Check className="h-5 w-5 text-[var(--gov-green)] flex-shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </Card>
        <p className="text-center text-xs text-[var(--gov-text-muted)]">
          <Link href="/trust" className="text-[var(--gov-navy-light)] font-semibold">← Back to certification</Link>
        </p>
      </div>
    </AppLayout>
  );
}

export default function TrustVerifyPage() {
  return (
    <Suspense fallback={<AppLayout title="Verify"><p className="p-8">Loading…</p></AppLayout>}>
      <VerifyContent />
    </Suspense>
  );
}
