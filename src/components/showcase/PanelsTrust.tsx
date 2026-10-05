"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RecordStatusBadge } from "@/components/ui/StatusBadges";
import { AuditTimeline, AUDIT_LABELS } from "@/components/audit/AuditTimeline";
import { CertificatePanel } from "@/components/records/CertificatePanel";
import { MapView } from "@/components/gis/MapView";
import type { RecordDetail } from "@/components/records/Record360";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useToast } from "@/contexts/ToastContext";
import { useApi } from "@/lib/use-api";
import { hasPermission } from "@/lib/config";
import { cn, formatDate, getFieldLabel } from "@/lib/utils";
import type { AuditEvent, SystemSettings } from "@/types";
import { ArrowRight, CheckCircle2, ExternalLink, Link2, MapPinned, ShieldAlert, ShieldCheck, Upload, UserCheck } from "lucide-react";
import { Fact } from "./PanelsPipeline";
import { useSnapshot } from "./snapshot";

const pct = (v: number) => `${Math.round(v * 100)}%`;

// ── 5. Confidence scoring ───────────────────────────────────────────────────

export function ConfidencePanel({ detail, settings }: { detail: RecordDetail; settings: SystemSettings | null }) {
  const { t } = useLocale();
  const { record } = detail;
  const review = settings?.reviewThreshold ?? 0.75;
  const high = settings?.highPriorityThreshold ?? 0.6;
  const fields = Object.entries(record.fields).sort((a, b) => a[1].confidence - b[1].confidence);
  const flagged = fields.filter(([, f]) => f.confidence < review);
  const v = record.validation;

  const routing =
    v?.validation_status === "INVALID"
      ? { tone: "red" as const, text: "Validation failed — the record goes to the top of the verification queue." }
      : record.averageConfidence < high
        ? { tone: "red" as const, text: "Average confidence is below the high-priority threshold — reviewed first." }
        : flagged.length
          ? { tone: "amber" as const, text: "{n} field(s) are below the review threshold — the officer is shown exactly these." }
          : settings?.autoApproveEnabled && v?.validation_status === "VALID" && record.averageConfidence >= settings.autoApproveThreshold
            ? { tone: "green" as const, text: "Every check passed above the auto-approval threshold — eligible for auto-approval." }
            : { tone: "green" as const, text: "Every field is above the review threshold — a quick confirmation by the officer is enough." };

  return (
    <div className="grid xl:grid-cols-[300px_minmax(0,1fr)] gap-4">
      <div className="space-y-3">
        <Card title="Record confidence">
          <p className={cn("text-5xl font-bold tabular-nums", record.averageConfidence >= review ? "text-[var(--gov-green)]" : "text-amber-600")}>{pct(record.averageConfidence)}</p>
          <div className="relative mt-4 h-3 rounded-full bg-gradient-to-r from-red-400 via-amber-300 to-green-500">
            <div className="absolute -top-1 h-5 w-1 rounded bg-[var(--gov-navy)]" style={{ left: `calc(${record.averageConfidence * 100}% - 2px)` }} />
          </div>
          <dl className="mt-4 space-y-1 text-xs">
            <div className="flex justify-between"><dt className="text-[var(--gov-text-muted)]">{t("High-priority threshold (%)")}</dt><dd className="font-semibold">{pct(high)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--gov-text-muted)]">{t("Review threshold (%)")}</dt><dd className="font-semibold">{pct(review)}</dd></div>
            <div className="flex justify-between">
              <dt className="text-[var(--gov-text-muted)]">{t("Auto-approve threshold (%)")}</dt>
              <dd className="font-semibold">{settings ? (settings.autoApproveEnabled ? pct(settings.autoApproveThreshold) : t("Off")) : "—"}</dd>
            </div>
          </dl>
        </Card>
        <div
          className={cn(
            "rounded-lg border p-3 text-sm",
            routing.tone === "red" ? "border-red-200 bg-red-50 text-red-800" : routing.tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-green-200 bg-green-50 text-green-900"
          )}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide mb-1">{t("Routing decision")}</p>
          {t(routing.text, { n: flagged.length })}
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="opacity-75">{t("Current status")}:</span>
            <RecordStatusBadge status={record.status} />
          </div>
        </div>
      </div>

      <Card title="Confidence per field">
        <p className="text-xs text-[var(--gov-text-muted)] mb-3">{t("Field confidence = extractor certainty × OCR confidence of the words it was read from. The line marks the review threshold.")}</p>
        <ul className="space-y-2.5">
          {fields.map(([key, f]) => {
            const low = f.confidence < review;
            return (
              <li key={key}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium text-[var(--gov-navy)] truncate">{t(getFieldLabel(key))}</span>
                  <span className={cn("tabular-nums font-semibold shrink-0", low ? "text-amber-700" : "text-[var(--gov-green)]")}>{pct(f.confidence)}</span>
                </div>
                <div className="relative mt-1 h-2 rounded-full bg-[var(--gov-border-light)]">
                  <div className={cn("h-2 rounded-full", low ? "bg-amber-500" : "bg-[var(--gov-green)]")} style={{ width: pct(f.confidence) }} />
                  <div className="absolute -top-1 h-4 w-0.5 bg-[var(--gov-navy)]" style={{ left: pct(review) }} />
                </div>
                {(f.modelConfidence !== undefined || f.ocrConfidence !== undefined) && (
                  <p className="mt-0.5 text-[11px] text-[var(--gov-text-muted)]">
                    {f.modelConfidence !== undefined && t("Model {model}", { model: pct(f.modelConfidence) })}
                    {f.modelConfidence !== undefined && f.ocrConfidence !== undefined && " · "}
                    {f.ocrConfidence !== undefined && t("OCR {ocr}", { ocr: pct(f.ocrConfidence) })}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

// ── 6. Human verification ──────────────────────────────────────────────────

const VERIFY_ACTIONS = new Set(["VERIFICATION_STARTED", "FIELD_EDITED", "OWNERS_EDITED", "DRAFT_SAVED", "RECORD_APPROVED", "RECORD_AUTO_APPROVED", "RECORD_REJECTED", "RECORD_SENT_BACK", "CERTIFICATE_GENERATED"]);

export function VerificationPanel({ detail }: { detail: RecordDetail }) {
  const { t } = useLocale();
  const { user } = useAuth();
  const { record } = detail;
  const events = detail.auditEvents.filter((e) => VERIFY_ACTIONS.has(e.action));
  const corrected = detail.corrections.filter((c) => !c.accepted);
  const pending = record.status === "VERIFICATION_REQUIRED";
  const snapshot = useSnapshot();

  return (
    <div className="grid xl:grid-cols-2 gap-4">
      <div className="space-y-4">
        {pending ? (
          <Card title="Waiting for an officer">
            <p className="text-sm text-[var(--gov-text-muted)] mb-3">
              {t("This record is in the verification queue. Open the workspace to check the flagged fields against the scan and approve it — then come back to see the certificate and ledger.")}
            </p>
            {!snapshot && user && hasPermission(user.role, "verification") && (
              <Link href={`/verification/${record.record_id}`}>
                <Button>
                  <UserCheck className="h-4 w-4" /> {t("Open verification workspace")}
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Fact label="Status" value={<RecordStatusBadge status={record.status} />} />
            <Fact label="Verified by" value={<span className="text-base">{record.verifiedBy ?? "—"}</span>} />
            <Fact label="Fields checked" value={detail.corrections.length || Object.keys(record.fields).length} />
            <Fact label="Fields corrected" value={corrected.length} tone={corrected.length ? "amber" : "green"} />
          </div>
        )}
        <Card title="AI vs verified values">
          {corrected.length === 0 ? (
            <p className="text-sm text-[var(--gov-text-muted)]">
              {pending ? t("Corrections made by the officer will appear here.") : t("The officer accepted every AI value unchanged.")}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase text-[var(--gov-text-muted)]">
                  <th className="pb-1 pr-2">{t("Field")}</th>
                  <th className="pb-1 pr-2">{t("AI reading")}</th>
                  <th className="pb-1">{t("Corrected to")}</th>
                </tr>
              </thead>
              <tbody>
                {corrected.map((c) => (
                  <tr key={c.field} className="border-t border-[var(--gov-border-light)]">
                    <td className="py-1.5 pr-2">{t(getFieldLabel(c.field))}</td>
                    <td className="py-1.5 pr-2 text-red-700 line-through">{c.aiValue || "∅"}</td>
                    <td className="py-1.5 font-medium text-[var(--gov-green)]">{c.humanValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-[var(--gov-text-muted)]">{t("Corrections become learning examples: repeated fixes are applied automatically to future documents.")}</p>
        </Card>
      </div>
      <Card title="Verification trail">
        <AuditTimeline events={[...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp))} />
      </Card>
    </div>
  );
}

// ── 7. GIS linking ─────────────────────────────────────────────────────────

export function GisPanel({ detail, settings, onChanged }: { detail: RecordDetail; settings: SystemSettings | null; onChanged: () => void }) {
  const { t, tx } = useLocale();
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const { parcel, record } = detail;
  const recordedHa = record.area_hectares ?? (record.area_unit === "hectare" ? record.area : null);
  const surveyed = parcel?.geometry_source === "surveyed";
  const diff = surveyed && parcel?.polygon_area_ha && recordedHa ? ((parcel.polygon_area_ha - recordedHa) / recordedHa) * 100 : null;
  const tolerance = settings?.areaTolerancePct ?? 5;
  const snapshot = useSnapshot();

  const uploadSample = async () => {
    setBusy(true);
    try {
      const geojson = await fetch("/samples/demo-parcel-chinhat.geojson").then((r) => r.blob());
      const form = new FormData();
      form.append("file", new File([geojson], "demo-parcel-chinhat.geojson", { type: "application/geo+json" }));
      const res = await fetch(`/api/gis/${record.record_id}`, { method: "PUT", body: form, credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Could not save boundary");
      toast("Surveyed boundary saved", "success");
      onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save boundary", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-4">
      <div className="min-w-0">
        {parcel?.center || parcel?.geometry ? (
          <MapView parcels={[parcel]} selectedId={parcel.parcel_id} height="460px" satellite={surveyed} />
        ) : (
          <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-[var(--gov-text-muted)]">{t("No location")}</div>
        )}
      </div>
      <div className="space-y-3">
        <Fact
          label="Geometry"
          value={
            <Badge variant={surveyed ? "success" : parcel?.geometry_source === "approximate" ? "warning" : "neutral"}>
              {t(surveyed ? "Surveyed boundary" : parcel?.geometry_source === "approximate" ? "Approximate location" : "No location")}
            </Badge>
          }
        />
        <Fact label="Recorded area" value={recordedHa !== null ? `${recordedHa} ${t("hectare")}` : "—"} />
        {surveyed && parcel?.polygon_area_ha != null && (
          <Fact label="Surveyed area" value={`${parcel.polygon_area_ha} ${t("hectare")}`} tone={diff !== null && Math.abs(diff) > tolerance ? "red" : "green"} />
        )}
        {diff !== null && (
          <p className={cn("text-sm font-medium", Math.abs(diff) > tolerance ? "text-red-700" : "text-[var(--gov-green)]")}>
            {Math.abs(diff) > tolerance
              ? t("{n}% difference — beyond the {tol}% tolerance, flagged for review", { n: diff.toFixed(1), tol: tolerance })
              : t("{n}% difference — within the {tol}% tolerance", { n: diff.toFixed(1), tol: tolerance })}
          </p>
        )}
        {parcel?.location_note && <p className="text-xs text-[var(--gov-text-muted)]">{tx(parcel.location_note)}</p>}
        {!snapshot && !surveyed && user && hasPermission(user.role, "gis_edit") && (
          <Button onClick={uploadSample} loading={busy} className="w-full">
            <Upload className="h-4 w-4" /> {t("Upload sample survey boundary")}
          </Button>
        )}
        {!snapshot && (
          <Link href={`/gis?record=${record.record_id}`} className="block">
            <Button variant="outline" className="w-full">
              <MapPinned className="h-4 w-4" /> {t("Open in map")}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

// ── 8. Blockchain-style integrity layer ─────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function Block({ event, anchor }: { event: AuditEvent; anchor: boolean }) {
  const { t } = useLocale();
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Link2 className="h-4 w-4 text-[var(--gov-saffron)] shrink-0" />
      <div className={cn("w-[180px] rounded-lg border bg-white p-2.5 shadow-sm", anchor ? "border-[var(--gov-green)] ring-2 ring-green-200" : "border-[var(--gov-border)]")}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-[var(--gov-navy)]">#{event.seq}</span>
          {anchor && <Badge variant="success">{t("Certificate anchor")}</Badge>}
        </div>
        <p className="mt-1 text-xs font-semibold text-[var(--gov-navy)] leading-tight">{t(AUDIT_LABELS[event.action] ?? event.action)}</p>
        <p className="text-[10px] text-[var(--gov-text-muted)]">{formatDate(event.timestamp)}</p>
        <p className="mt-1.5 font-mono text-[10px] text-[var(--gov-text-muted)]">
          {t("prev")} {event.prevHash?.slice(0, 10)}…
        </p>
        <p className="font-mono text-[10px] font-semibold text-[var(--gov-green)]">
          {t("hash")} {event.hash?.slice(0, 10)}…
        </p>
      </div>
    </div>
  );
}

export function LedgerPanel({ detail }: { detail: RecordDetail }) {
  const { t } = useLocale();
  const { record } = detail;
  const snapshot = useSnapshot();
  const [run, setRun] = useState(0);
  const live = useApi<{ valid: boolean; checked: number; brokenAtSeq?: number; head: string | null }>(run && !snapshot ? `/api/audit/verify?demo=${run}` : null);
  const chain = snapshot ? { data: run ? snapshot.chain : undefined, loading: false } : live;
  const blocks = useMemo(() => [...detail.auditEvents].filter((e) => e.hash).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)), [detail.auditEvents]);
  // Start at the newest blocks, where the certificate is anchored
  const chainRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chainRef.current?.scrollTo({ left: chainRef.current.scrollWidth });
  }, [blocks.length]);

  const canonical = useMemo(
    () => (owner: string) =>
      JSON.stringify({ record_id: record.record_id, owner_name: owner, khasra_number: record.khasra_number, khata_number: record.khata_number, area: record.area, area_unit: record.area_unit, village: record.village, district: record.district }),
    [record]
  );
  const [owner, setOwner] = useState(record.owner_name);
  const [hashes, setHashes] = useState<{ original: string; edited: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all([sha256(canonical(record.owner_name)), sha256(canonical(owner))]).then(([original, edited]) => {
      if (!cancelled) setHashes({ original, edited });
    });
    return () => {
      cancelled = true;
    };
  }, [canonical, owner, record.owner_name]);
  const tampered = hashes ? hashes.original !== hashes.edited : false;

  return (
    <div className="space-y-4">
      <Card
        title="Audit ledger for this record"
        action={
          <div className="flex items-center gap-2">
            {chain.data && (
              <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", chain.data.valid ? "text-[var(--gov-green)]" : "text-red-700")}>
                {chain.data.valid ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                {chain.data.valid ? t("Chain intact ({n} entries)", { n: chain.data.checked }) : t("Broken at #{n}", { n: chain.data.brokenAtSeq ?? "?" })}
              </span>
            )}
            <Button size="sm" variant="outline" loading={chain.loading} onClick={() => setRun((n) => n + 1)}>
              {t("Re-verify entire ledger")}
            </Button>
          </div>
        }
      >
        <p className="text-xs text-[var(--gov-text-muted)] mb-3">
          {t("Each block stores the hash of the block before it. Changing any past entry changes its hash and breaks every link after it.")}
        </p>
        <div ref={chainRef} className="flex items-center overflow-x-auto pb-2">
          <div className="flex items-center gap-1.5 shrink-0 mr-1.5">
            <div className="rounded-lg border border-dashed border-[var(--gov-border)] px-3 py-6 text-center text-[10px] font-mono text-[var(--gov-text-muted)]">{t("earlier blocks")}</div>
          </div>
          {blocks.map((e) => (
            <Block key={e.id} event={e} anchor={Boolean(record.certificate?.audit_head && e.hash === record.certificate.audit_head)} />
          ))}
        </div>
      </Card>

      <div className="grid 2xl:grid-cols-2 gap-4">
        <Card title="Try it: tamper with the record">
          <p className="text-xs text-[var(--gov-text-muted)] mb-3">
            {t("A simulation in your browser — the stored record is not changed. Edit the owner’s name and watch the fingerprint change.")}
          </p>
          <label htmlFor="tamper-owner" className="block text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)] mb-1">
            {t("Owner name")}
          </label>
          <Input id="tamper-owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
          {hashes && (
            <div className="mt-3 space-y-2 text-xs">
              <div>
                <p className="text-[var(--gov-text-muted)]">{t(record.certificate ? "Fingerprint of the certified data" : "Fingerprint of the stored record")}</p>
                <p className="font-mono break-all text-[var(--gov-navy)]">{hashes.original}</p>
              </div>
              <div>
                <p className="text-[var(--gov-text-muted)]">{t("Fingerprint after your edit")}</p>
                <p className={cn("font-mono break-all", tampered ? "text-red-700" : "text-[var(--gov-green)]")}>{hashes.edited}</p>
              </div>
              <p className={cn("flex items-center gap-1.5 text-sm font-semibold", tampered ? "text-red-700" : "text-[var(--gov-green)]")}>
                {tampered ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {tampered ? t("Fingerprints differ — the signature check would fail and the QR page would show “cannot be verified”.") : t("Fingerprints match — the record is authentic.")}
              </p>
              {tampered && (
                <Button size="sm" variant="ghost" onClick={() => setOwner(record.owner_name)}>
                  {t("Undo")}
                </Button>
              )}
            </div>
          )}
        </Card>
        <div>
          {record.certificate ? (
            <CertificatePanel
              recordId={record.record_id}
              data={snapshot?.certificate ?? undefined}
              qrSrc={snapshot?.qr ?? undefined}
              publicLinks={!snapshot}
            />
          ) : (
            <Card title="Digital certificate">
              <p className="text-sm text-[var(--gov-text-muted)]">{t("The certificate is issued when an officer approves the record. Approve it in the verification step, then return here.")}</p>
            </Card>
          )}
          {record.certificate && !snapshot && (
            <a href={`/verify/${record.record_id}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--gov-navy-light)]">
              <ExternalLink className="h-4 w-4" /> {t("Open the public verification page (what the QR code opens)")}
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
