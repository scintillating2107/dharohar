"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Link2, Shield, QrCode, ArrowDown } from "lucide-react";
import { apiGet } from "@/lib/api-client";
import { DEMO_RECORD_ID } from "@/lib/record-ids";
import type { LandRecord } from "@/types";
import { formatDate } from "@/lib/utils";

function TrustContent() {
  const searchParams = useSearchParams();
  const recordId = searchParams.get("record") || DEMO_RECORD_ID;
  const [record, setRecord] = useState<LandRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiGet<{ record: LandRecord }>(`/api/records/${recordId}`);
        if (!cancelled) setRecord(data.record);
      } catch {
        if (!cancelled) setRecord(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recordId]);

  if (loading) return <LoadingState />;
  if (!record) return <ErrorState message="Record not found for certification view." />;

  const certified = record.status === "VERIFIED" && Boolean(record.certification_hash);
  const docHash = record.certification_hash?.slice(0, 20) || "—";
  const recordHash = record.certification_hash || "Pending verification";
  const verifiedAt = record.certified_at ? formatDate(record.certified_at) : "—";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--gov-text-muted)] flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Record certification
        </p>
        <h1 className="text-2xl font-bold text-[var(--gov-navy)] mt-1">Immutable record certification</h1>
        <p className="text-sm text-[var(--gov-text-muted)] mt-2 leading-relaxed">
          Sensitive land documents are not placed on-chain. Verified record snapshots receive a cryptographic hash
          and a ledger anchor for tamper-evident audit, complementary to departmental sign-off workflows.
        </p>
      </div>

      <Card title="Record certification">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[var(--gov-text-muted)]">Record ID</p>
            <p className="font-semibold text-[var(--gov-navy)]">{record.record_id}</p>
          </div>
          <div>
            <p className="text-[var(--gov-text-muted)]">Record status</p>
            <Badge variant={record.status === "VERIFIED" ? "success" : "warning"} className="mt-1">
              {record.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[var(--gov-text-muted)]">Document hash (SHA-256, demo)</p>
            <p className="font-mono text-xs break-all">{certified ? `${docHash}…` : "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[var(--gov-text-muted)]">Record hash</p>
            <p className="font-mono text-xs break-all">{recordHash}</p>
          </div>
          <div>
            <p className="text-[var(--gov-text-muted)]">Certified at</p>
            <p className="font-medium">{verifiedAt}</p>
          </div>
          <div>
            <p className="text-[var(--gov-text-muted)]">Blockchain status</p>
            {certified ? (
              <Badge variant="success" className="mt-1">✓ CERTIFIED</Badge>
            ) : (
              <Badge variant="neutral" className="mt-1">Not certified — complete verification first</Badge>
            )}
          </div>
          {certified && (
            <div className="sm:col-span-2">
              <p className="text-[var(--gov-text-muted)]">Transaction (demo)</p>
              <p className="font-mono text-xs">0x{record.record_id.replace(/[^A-Fa-f0-9]/g, "").slice(0, 16) || "pending"}</p>
            </div>
          )}
        </div>
        {!certified && (
          <p className="text-sm text-amber-800 mt-4">
            Approve this record in the verification workspace to generate a certificate hash.
          </p>
        )}
      </Card>

      <Card title="Certification flow">
        <div className="flex flex-col items-center gap-2 py-4 text-sm font-medium text-[var(--gov-navy)]">
          {["Document", "SHA-256 hash", "Immutable certificate", "Blockchain transaction", "Verification QR"].map(
            (step, i, arr) => (
              <div key={step} className="flex flex-col items-center">
                <span className="rounded-lg border border-[var(--gov-border)] px-4 py-2 bg-white">{step}</span>
                {i < arr.length - 1 && <ArrowDown className="h-5 w-5 text-[var(--gov-text-muted)] my-1" />}
              </div>
            )
          )}
        </div>
        <div className="flex flex-wrap gap-3 justify-center mt-4">
          <div className="h-24 w-24 rounded-lg border-2 border-dashed border-[var(--gov-border)] flex items-center justify-center">
            <QrCode className="h-10 w-10 text-[var(--gov-navy)]" />
          </div>
          {certified && (
            <Link href={`/trust/verify?record=${record.record_id}`}>
              <Button>Open verification page</Button>
            </Link>
          )}
          <Link href={`/records/${record.record_id}?tab=certification`}>
            <Button variant="outline">Record 360°</Button>
          </Link>
        </div>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border border-[var(--gov-border)] bg-[var(--gov-bg-subtle)] p-4 text-sm">
        <Shield className="h-5 w-5 text-[var(--gov-navy)] flex-shrink-0" />
        <p className="text-[var(--gov-text-muted)]">
          Certificates follow departmental PKI and data retention policy.
        </p>
      </div>
    </div>
  );
}

export default function TrustLayerPage() {
  return (
    <AppLayout title="Immutable certification">
      <Suspense fallback={<LoadingState />}>
        <TrustContent />
      </Suspense>
    </AppLayout>
  );
}
