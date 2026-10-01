"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RecordIdLink } from "@/components/records/RecordIdLink";
import { LandRecordTable } from "@/components/records/LandRecordTable";
import { OCRResultsView } from "@/components/documents/OCRResultsView";
import { CompareRecordsPanel } from "@/components/validation/CompareRecordsPanel";
import { VerificationHistory } from "@/components/verification/VerificationHistory";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { ValidationSummary } from "@/components/validation/ValidationSummary";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfidenceBadge } from "@/components/ui/StatusBadges";
import { formatConfidence, formatDate } from "@/lib/utils";
import type { AuditEvent, Document, LandRecord, Parcel } from "@/types";
import { CheckSquare, Map } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  "Overview",
  "Document",
  "OCR",
  "Extracted Data",
  "Validation",
  "Verification",
  "GIS",
  "History",
  "Certification",
] as const;

type Tab = (typeof TABS)[number];

const TAB_SLUGS: Record<Tab, string> = {
  Overview: "overview",
  Document: "document",
  OCR: "ocr",
  "Extracted Data": "extracted",
  Validation: "validation",
  Verification: "verification",
  GIS: "gis",
  History: "history",
  Certification: "certification",
};

const SLUG_TO_TAB: Record<string, Tab> = Object.fromEntries(
  Object.entries(TAB_SLUGS).map(([tab, slug]) => [slug, tab as Tab])
) as Record<string, Tab>;

export function Record360({
  record,
  document,
  auditEvents,
  parcel,
}: {
  record: LandRecord;
  document: Document | null;
  auditEvents: AuditEvent[];
  parcel: Parcel | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromUrl = searchParams.get("tab");
  const initialTab = (tabFromUrl && SLUG_TO_TAB[tabFromUrl]) || "Overview";
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const next = searchParams.get("tab");
    if (next && SLUG_TO_TAB[next]) setTab(SLUG_TO_TAB[next]);
  }, [searchParams]);

  const setTabAndUrl = (t: Tab) => {
    setTab(t);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", TAB_SLUGS[t]);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const certHash = useMemo(() => {
    if (record.certification_hash) return record.certification_hash;
    if (record.status === "VERIFIED") return `${record.record_id.slice(-8)}…verified`;
    return null;
  }, [record]);

  return (
    <div className="space-y-6">
      <div className="gov-card p-6 border-l-4 border-l-[var(--gov-saffron)]">
        <RecordIdLink recordId={record.record_id} className="text-xl" />
        <h1 className="text-2xl font-bold text-[var(--gov-navy)] mt-2">{record.owner_name}</h1>
        <p className="text-[var(--gov-text-muted)]">
          Khasra {record.khasra_number} · {record.village}, {record.district}
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <ConfidenceBadge confidence={record.averageConfidence} />
          <Badge variant={record.status === "VERIFIED" ? "success" : "warning" as const}>
            {record.status.replace(/_/g, " ")}
          </Badge>
          {record.status === "VERIFICATION_REQUIRED" && (
            <Link href={`/verification/${record.record_id}`}>
              <Button size="sm"><CheckSquare className="h-4 w-4" /> Verify</Button>
            </Link>
          )}
          <Link href="/gis">
            <Button variant="outline" size="sm"><Map className="h-4 w-4" /> GIS</Button>
          </Link>
          <Link href="/demo/workflow">
            <Button variant="outline" size="sm">Guided workflow</Button>
          </Link>
        </div>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-[var(--gov-border-light)] pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTabAndUrl(t)}
            className={cn(
              "px-3 py-2 text-xs sm:text-sm font-semibold rounded-t-md",
              tab === t
                ? "bg-[var(--gov-navy)] text-white"
                : "text-[var(--gov-text-muted)] hover:bg-[var(--gov-bg)]"
            )}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Overview" && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card title="Lifecycle">
            <ul className="text-sm space-y-2 text-[var(--gov-text-muted)]">
              <li>Uploaded {document ? formatDate(document.uploadedAt) : "—"}</li>
              <li>Confidence {formatConfidence(record.averageConfidence)}</li>
              <li>Validation {record.validation?.validation_status || "—"}</li>
            </ul>
          </Card>
          <Card title="Quick links">
            <div className="flex flex-col gap-2 text-sm">
              {document && <Link href={`/documents/${document.id}`} className="text-[var(--gov-navy-light)] font-semibold">Open document</Link>}
              <Link href={`/audit?recordId=${record.record_id}`} className="text-[var(--gov-navy-light)] font-semibold">Audit log</Link>
              <Link href="/trust" className="text-[var(--gov-navy-light)] font-semibold">Certification</Link>
            </div>
          </Card>
          <Card title="GIS">
            {parcel ? (
              <p className="text-sm">Parcel {parcel.parcel_id} · {parcel.area} {parcel.area_unit}</p>
            ) : (
              <p className="text-sm text-[var(--gov-text-muted)]">No parcel linked yet.</p>
            )}
          </Card>
        </div>
      )}

      {tab === "Document" && document && (
        <Card title={document.name}>
          <p className="text-sm text-[var(--gov-text-muted)]">{document.id} · {document.pageCount} pages</p>
          <Link href={`/documents/${document.id}/quality`} className="inline-block mt-3">
            <Button variant="outline" size="sm">Preview & quality</Button>
          </Link>
        </Card>
      )}

      {tab === "OCR" && document && record.ocr && (
        <OCRResultsView document={document} ocr={record.ocr} />
      )}

      {tab === "Extracted Data" && <LandRecordTable record={record} />}

      {tab === "Validation" && (
        <div className="space-y-6">
          {record.validation && <ValidationSummary validation={record.validation} />}
          <CompareRecordsPanel record={record} />
        </div>
      )}

      {tab === "Verification" && (
        <VerificationHistory events={auditEvents} record={record} />
      )}

      {tab === "GIS" && (
        <Card title="Parcel">
          {parcel ? (
            <dl className="text-sm space-y-2">
              <div><dt className="text-[var(--gov-text-muted)]">Khasra</dt><dd className="font-semibold">{parcel.khasra_number}</dd></div>
              <div><dt className="text-[var(--gov-text-muted)]">Area</dt><dd>{parcel.area} {parcel.area_unit}</dd></div>
              <div><dt className="text-[var(--gov-text-muted)]">Status</dt><dd>{parcel.status}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-[var(--gov-text-muted)]">Link parcel from GIS after verification.</p>
          )}
        </Card>
      )}

      {tab === "History" && (
        <Card title="Audit trail">
          <AuditTimeline events={auditEvents} variant="full" />
        </Card>
      )}

      {tab === "Certification" && (
        <Card title="Record certification">
          <p className="text-sm text-[var(--gov-text-muted)] mb-4">
            Cryptographic hash of the verified record snapshot for tamper-evident verification.
          </p>
          {record.status === "VERIFIED" && certHash ? (
            <p className="font-mono text-xs break-all">Record hash: {certHash}</p>
          ) : (
            <p className="text-sm text-amber-800">Certificate is available after officer approval and verification.</p>
          )}
          <Link href={`/trust?record=${record.record_id}`} className="inline-block mt-4">
            <Button size="sm" variant="outline">Open trust layer</Button>
          </Link>
          {record.status === "VERIFIED" && (
            <Link href={`/trust/verify?record=${record.record_id}`} className="inline-block mt-4 ml-2">
              <Button size="sm">Verify certificate</Button>
            </Link>
          )}
        </Card>
      )}
    </div>
  );
}
