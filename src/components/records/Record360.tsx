"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LandRecordTable } from "@/components/records/LandRecordTable";
import { CertificatePanel } from "@/components/records/CertificatePanel";
import { OCRResultsView } from "@/components/documents/OCRResultsView";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { ValidationSummary } from "@/components/validation/ValidationSummary";
import { MapView } from "@/components/gis/MapView";
import { ClaimRecordButton } from "@/components/records/ClaimRecordButton";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfidenceBadge, RecordStatusBadge, ValidationStatusBadge } from "@/components/ui/StatusBadges";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { hasPermission } from "@/lib/config";
import { cn, formatArea, formatDate, getFieldLabel } from "@/lib/utils";
import type { AuditEvent, Document, LandRecord, Parcel, RecordVersion } from "@/types";
import { CheckSquare, Map as MapIcon, GitCompare } from "lucide-react";

export interface RecordDetail {
  record: LandRecord;
  document: Document | null;
  auditEvents: AuditEvent[];
  parcel: Parcel | null;
  versions: RecordVersion[];
  corrections: { field: string; aiValue: string; humanValue: string; accepted: boolean }[];
  claimed?: boolean;
}

const OFFICER_TABS = ["Overview", "Fields", "Scan & OCR", "Validation", "History", "Map", "Certificate"] as const;
const CITIZEN_TABS = ["Overview", "Map", "Certificate"] as const;
type Tab = (typeof OFFICER_TABS)[number];

const SLUG: Record<Tab, string> = {
  Overview: "overview",
  Fields: "fields",
  "Scan & OCR": "ocr",
  Validation: "validation",
  History: "history",
  Map: "map",
  Certificate: "certification",
};

function VersionDiff({ versions }: { versions: RecordVersion[] }) {
  const { t, tx } = useLocale();
  if (versions.length === 0) return <p className="text-sm text-[var(--gov-text-muted)]">{t("No versions recorded.")}</p>;
  return (
    <ol className="space-y-4">
      {[...versions].reverse().map((v, i, arr) => {
        const prev = arr[i + 1];
        const changes = prev
          ? Object.keys({ ...v.snapshot.fields, ...prev.snapshot.fields }).filter(
              (k) => (v.snapshot.fields?.[k]?.value ?? "") !== (prev.snapshot.fields?.[k]?.value ?? "")
            )
          : [];
        return (
          <li key={v.id} className="rounded-lg border border-[var(--gov-border-light)] p-3">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-semibold text-[var(--gov-navy)]">{t("Version {n}", { n: v.version })} — {tx(v.reason)}</span>
              <span className="text-xs text-[var(--gov-text-muted)]">{formatDate(v.created_at)} · {v.created_by_name}</span>
            </div>
            {changes.length > 0 && (
              <ul className="mt-2 text-xs space-y-0.5">
                {changes.map((k) => (
                  <li key={k}>
                    <span className="text-[var(--gov-text-muted)]">{t(getFieldLabel(k))}:</span>{" "}
                    <span className="line-through text-red-700">{prev.snapshot.fields?.[k]?.value ?? "—"}</span> →{" "}
                    <span className="text-[var(--gov-green)] font-medium">{v.snapshot.fields?.[k]?.value ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function Record360({ detail }: { detail: RecordDetail }) {
  const { record, document, parcel } = detail;
  const { user } = useAuth();
  const { t: tr, tx } = useLocale();
  const params = useSearchParams();
  const router = useRouter();
  const isCitizen = user?.role === "CITIZEN";
  const can = (p: Parameters<typeof hasPermission>[1]) => (user ? hasPermission(user.role, p) : false);
  // Only offer tabs whose data this role may load
  const tabs: readonly Tab[] = isCitizen
    ? CITIZEN_TABS
    : OFFICER_TABS.filter((t) => (t === "Scan & OCR" ? can("documents") : t === "Validation" ? can("validation") : true));
  const fromUrl = tabs.find((t) => SLUG[t] === params.get("tab"));
  const [tab, setTab] = useState<Tab>(fromUrl ?? "Overview");
  const canVerify = user ? hasPermission(user.role, "verification") : false;

  const go = (t: Tab) => {
    setTab(t);
    const next = new URLSearchParams(params.toString());
    next.set("tab", SLUG[t]);
    router.replace(`?${next}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="gov-card p-6 border-l-4 border-l-[var(--gov-saffron)]">
        <p className="font-mono text-sm text-[var(--gov-navy-light)]">{record.record_id} · v{record.version ?? 1}</p>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--gov-navy)] mt-1">{record.owner_name || tr("Owner not extracted")}</h1>
        <p className="text-[var(--gov-text-muted)]">
          {tr("Khasra")} {record.khasra_number || "—"} · {tr("Khata")} {record.khata_number || "—"} · {[record.village, record.tehsil, record.district, record.state].filter(Boolean).map((x) => tr(x)).join(", ")}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <RecordStatusBadge status={record.status} />
          {!isCitizen && record.status !== "VERIFIED" && <ConfidenceBadge confidence={record.averageConfidence} />}
          {!isCitizen && record.status !== "VERIFIED" && record.validation && <ValidationStatusBadge status={record.validation.validation_status} />}
          {canVerify && record.status === "VERIFICATION_REQUIRED" && (
            <Link href={`/verification/${record.record_id}`}>
              <Button size="sm"><CheckSquare className="h-4 w-4" /> {tr("Verify")}</Button>
            </Link>
          )}
          {can("validation") && (
            <Link href={`/compare?recordId=${record.record_id}`}>
              <Button size="sm" variant="outline"><GitCompare className="h-4 w-4" /> {tr("Compare")}</Button>
            </Link>
          )}
          <Link href={`/gis?record=${record.record_id}`}>
            <Button size="sm" variant="outline"><MapIcon className="h-4 w-4" /> {tr("Map")}</Button>
          </Link>
          {isCitizen && !detail.claimed && <ClaimRecordButton recordId={record.record_id} />}
        </div>
      </div>

      <nav className="flex gap-1 border-b border-[var(--gov-border-light)] pb-1 overflow-x-auto" aria-label={tr("Record sections")}>
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => go(t)}
            aria-current={tab === t ? "page" : undefined}
            className={cn(
              "px-3 py-2 text-xs sm:text-sm font-semibold rounded-t-md whitespace-nowrap flex-shrink-0",
              tab === t ? "bg-[var(--gov-navy)] text-white" : "text-[var(--gov-text-muted)] hover:bg-[var(--gov-bg)]"
            )}
          >
            {tr(t)}
          </button>
        ))}
      </nav>

      {tab === "Overview" && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card title="Land">
            <dl className="text-sm space-y-1.5">
              <div><dt className="text-[var(--gov-text-muted)]">{tr("Area")}</dt><dd className="font-medium">{formatArea(record.area, tr(record.area_unit), record.area_hectares)}</dd></div>
              <div><dt className="text-[var(--gov-text-muted)]">{tr("Land Classification")}</dt><dd>{record.land_type ? tr(record.land_type) : "—"}</dd></div>
              <div><dt className="text-[var(--gov-text-muted)]">{tr("Survey Number")}</dt><dd>{record.survey_number ?? "—"}</dd></div>
              <div><dt className="text-[var(--gov-text-muted)]">{tr("Mutation")}</dt><dd>{record.mutation_number ?? "—"}{record.mutation_date ? ` (${record.mutation_date})` : ""}</dd></div>
            </dl>
          </Card>
          <Card title="Owners">
            {record.owners?.length ? (
              <ul className="text-sm space-y-1">
                {record.owners.map((o, i) => (
                  <li key={i}>
                    {o.name}
                    {o.relation_name && <span className="text-[var(--gov-text-muted)]"> · {tr(o.relation_type ?? "S/O")} {o.relation_name}</span>}
                    {o.share !== undefined && <span className="text-[var(--gov-text-muted)]"> · {o.share}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm">{record.owner_name}{record.father_name ? ` · ${tr("S/O")} ${record.father_name}` : ""}</p>
            )}
          </Card>
          <Card title="Lifecycle">
            <ul className="text-sm space-y-1.5 text-[var(--gov-text-muted)]">
              <li>{tr("Created")} {formatDate(record.createdAt)}</li>
              <li>{tr("Updated")} {formatDate(record.updatedAt)}</li>
              {record.verifiedAt && <li className="text-[var(--gov-green)]">{tr("Verified {date} by {name}", { date: formatDate(record.verifiedAt), name: record.verifiedBy ?? "" })}</li>}
              {document && can("documents") && (
                <li>
                  {tr("Source")}: <Link href={`/documents/${document.id}`} className="text-[var(--gov-navy-light)] font-semibold">{document.name}</Link>
                </li>
              )}
            </ul>
          </Card>
        </div>
      )}

      {tab === "Fields" && <LandRecordTable record={record} />}

      {tab === "Scan & OCR" &&
        (document && record.ocr ? (
          <OCRResultsView document={document} ocr={record.ocr} />
        ) : (
          <p className="text-sm text-[var(--gov-text-muted)]">{tr("OCR output is not available.")}</p>
        ))}

      {tab === "Validation" &&
        (record.validation ? <ValidationSummary validation={record.validation} /> : <p className="text-sm text-[var(--gov-text-muted)]">{tr("Not validated.")}</p>)}

      {tab === "History" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Versions">
            <VersionDiff versions={detail.versions} />
          </Card>
          <div className="space-y-6">
            {detail.corrections.length > 0 && (
              <Card title="AI vs verified values">
                <ul className="text-sm space-y-1">
                  {detail.corrections.map((c) => (
                    <li key={c.field} className="flex justify-between gap-3">
                      <span className="text-[var(--gov-text-muted)]">{tr(getFieldLabel(c.field))}</span>
                      {c.accepted ? (
                        <span className="text-[var(--gov-green)]">{tr("accepted")}</span>
                      ) : (
                        <span>
                          <span className="line-through text-red-700">{c.aiValue}</span> → <span className="text-[var(--gov-green)]">{c.humanValue || tr("removed")}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <Card title="Audit trail">
              <AuditTimeline events={detail.auditEvents} variant="full" />
            </Card>
          </div>
        </div>
      )}

      {tab === "Map" && (
        <Card title="Parcel">
          {parcel ? (
            <>
              <MapView parcels={[parcel]} selectedId={parcel.parcel_id} height="420px" />
              <p className="text-xs text-[var(--gov-text-muted)] mt-2">{tx(parcel.location_note)}</p>
            </>
          ) : (
            <p className="text-sm text-[var(--gov-text-muted)]">{tr("No parcel linked yet.")}</p>
          )}
        </Card>
      )}

      {tab === "Certificate" && <CertificatePanel recordId={record.record_id} />}
    </div>
  );
}
