"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/States";
import { useApi } from "@/lib/use-api";
import { useLocale } from "@/contexts/LocaleContext";
import { formatDate } from "@/lib/utils";
import type { Certificate } from "@/types";
import { CheckCircle2, XCircle, ExternalLink, Printer } from "lucide-react";

export interface CertificateCheckResult {
  record_id: string;
  valid: boolean;
  checks: { name: string; ok: boolean; detail: string }[];
  certificate: Certificate | null;
  public_key: { key_id: string; pem: string };
}

/** Live re-verification of a record's signed certificate. */
export function CertificatePanel({ recordId }: { recordId: string }) {
  const { t, tx } = useLocale();
  const { data, initialLoading, error } = useApi<CertificateCheckResult>(`/api/records/${recordId}/certificate`);
  if (initialLoading) return <LoadingState message="Verifying certificate…" />;
  if (!data) return <p className="text-sm text-red-700">{tx(error || "Could not verify certificate")}</p>;
  const cert = data.certificate;

  return (
    <div className="grid lg:grid-cols-[1fr_260px] gap-6">
      <Card title="Certificate verification">
        <div className="flex items-center gap-2 mb-4">
          {cert ? (
            data.valid ? (
              <Badge variant="success">{t("Valid — signature and data intact")}</Badge>
            ) : (
              <Badge variant="error">{t("Verification failed")}</Badge>
            )
          ) : (
            <Badge variant="neutral">{t("Not certified yet")}</Badge>
          )}
        </div>
        <ul className="space-y-2">
          {data.checks.map((c) => (
            <li key={c.name} className="flex gap-2 text-sm">
              {c.ok ? <CheckCircle2 className="h-5 w-5 text-[var(--gov-green)] flex-shrink-0" /> : <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />}
              <span>
                <strong className="text-[var(--gov-navy)]">{tx(c.name)}</strong>
                <span className="block text-xs text-[var(--gov-text-muted)]">{tx(c.detail)}</span>
              </span>
            </li>
          ))}
        </ul>
        {cert && (
          <dl className="mt-6 grid sm:grid-cols-2 gap-3 text-xs">
            <div><dt className="text-[var(--gov-text-muted)]">{t("Certified")}</dt><dd className="font-medium">{t("{date} by {name}", { date: formatDate(cert.certified_at), name: cert.certified_by })}</dd></div>
            <div><dt className="text-[var(--gov-text-muted)]">{t("Version")}</dt><dd className="font-medium">v{cert.version}</dd></div>
            <div className="sm:col-span-2"><dt className="text-[var(--gov-text-muted)]">{t("Record hash (SHA-256)")}</dt><dd className="font-mono break-all">{cert.record_hash}</dd></div>
            {cert.document_sha256 && <div className="sm:col-span-2"><dt className="text-[var(--gov-text-muted)]">{t("Source scan hash")}</dt><dd className="font-mono break-all">{cert.document_sha256}</dd></div>}
            {cert.audit_head && <div className="sm:col-span-2"><dt className="text-[var(--gov-text-muted)]">{t("Audit chain anchor")}</dt><dd className="font-mono break-all">{cert.audit_head}</dd></div>}
            <div className="sm:col-span-2"><dt className="text-[var(--gov-text-muted)]">{t("Signature ({algorithm}, key {key})", { algorithm: cert.algorithm, key: cert.key_id })}</dt><dd className="font-mono break-all">{cert.signature}</dd></div>
          </dl>
        )}
      </Card>
      {cert && (
        <Card title="Public verification">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/public/qr/${recordId}`} alt={t("QR code to verify {id}", { id: recordId })} className="w-full max-w-[220px] mx-auto" />
          <p className="text-xs text-[var(--gov-text-muted)] text-center mt-2">{t("Scan to verify this record without signing in.")}</p>
          <div className="flex flex-col gap-2 mt-4">
            <Link href={`/verify/${recordId}`} target="_blank">
              <Button variant="outline" size="sm" className="w-full"><ExternalLink className="h-4 w-4" /> {t("Open public page")}</Button>
            </Link>
            <Link href={`/verify/${recordId}?print=1`} target="_blank">
              <Button size="sm" className="w-full"><Printer className="h-4 w-4" /> {t("Print certificate")}</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
