"use client";

import { GovHeader, GovFooter } from "@/components/layout/GovBranding";
import { useLocale } from "@/contexts/LocaleContext";
import { formatArea } from "@/lib/utils";
import { intlLocale } from "@/lib/i18n";
import type { publicVerification } from "@/server/public-verify";
import { PrintOnLoad } from "./PrintOnLoad";

export type VerifyResult = Awaited<ReturnType<typeof publicVerification>>;

/** Rendering of the public verification page (client side so it follows the language toggle). */
export function VerifyView({ recordId, result, unavailable, print }: { recordId: string; result: VerifyResult; unavailable: boolean; print: boolean }) {
  const { t, tx, locale } = useLocale();
  const fmt = (iso: string | null | undefined) =>
    iso ? new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long", timeStyle: "short" }).format(new Date(iso)) : "—";
  const dt = "text-[var(--gov-text-muted)]";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--gov-bg)] print:bg-white">
      <div className="print:hidden">
        <GovHeader />
      </div>
      {print && <PrintOnLoad />}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:p-6 space-y-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gov-text-muted)]">{t("Department of Land Resources")} · {t("Dharohar")}</p>
          <h1 className="text-2xl font-bold text-[var(--gov-navy)] mt-1">{t("Land record certificate")}</h1>
          <p className="font-mono text-sm mt-1 break-all">{recordId}</p>
        </div>

        {unavailable ? (
          <div className="gov-card p-6 text-center">
            <p className="font-semibold text-amber-800">{t("Verification is temporarily unavailable.")}</p>
            <p className="text-sm text-[var(--gov-text-muted)] mt-1">{t("Please try again later or contact the issuing office.")}</p>
          </div>
        ) : !result ? (
          <div className="gov-card p-6 text-center">
            <p className="font-semibold text-red-700">{t("No land record with this ID exists.")}</p>
            <p className="text-sm text-[var(--gov-text-muted)] mt-1">{t("Check the ID printed on the certificate, e.g. LR-2026-000001.")}</p>
          </div>
        ) : (
          <>
            <div className={`gov-card p-5 border-l-4 ${result.valid ? "border-l-[var(--gov-green)]" : "border-l-red-600"}`} role="status">
              <p className={`text-lg font-bold ${result.valid ? "text-[var(--gov-green)]" : "text-red-700"}`}>
                {result.valid ? `✓ ${t("Authentic — record verified and unaltered")}` : `✗ ${t("This record cannot be verified")}`}
              </p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {result.checks.map((c) => (
                  <li key={c.name}>
                    <span className={c.ok ? "text-[var(--gov-green)]" : "text-red-700"}>{c.ok ? "✓" : "✗"}</span> <strong>{tx(c.name)}</strong> —{" "}
                    <span className="text-[var(--gov-text-muted)]">{tx(c.detail)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {result.summary && (
              <div className="gov-card p-5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--gov-navy)] mb-3">{t("Record of rights")}</h2>
                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <dt className={dt}>{t("Owner(s)")}</dt>
                    <dd className="font-semibold">{(result.summary.owners?.length ? result.summary.owners.map((o) => o.name).join(", ") : result.summary.owner_name) || "—"}</dd>
                  </div>
                  <div><dt className={dt}>{t("Father / husband")}</dt><dd>{result.summary.father_name ?? "—"}</dd></div>
                  <div><dt className={dt}>{t("Khasra (plot) no.")}</dt><dd className="font-semibold">{result.summary.khasra_number || "—"}</dd></div>
                  <div><dt className={dt}>{t("Khata no.")}</dt><dd>{result.summary.khata_number || "—"}</dd></div>
                  <div><dt className={dt}>{t("Area")}</dt><dd>{formatArea(result.summary.area, result.summary.area_unit, result.summary.area_hectares)}</dd></div>
                  <div><dt className={dt}>{t("Land classification")}</dt><dd>{result.summary.land_type ? t(result.summary.land_type) : "—"}</dd></div>
                  <div className="sm:col-span-2">
                    <dt className={dt}>{t("Location")}</dt>
                    <dd>{[result.summary.village, result.summary.tehsil, result.summary.district, result.summary.state].filter(Boolean).map((p) => t(p as string)).join(", ")}</dd>
                  </div>
                  <div>
                    <dt className={dt}>{t("Mutation")}</dt>
                    <dd>{result.summary.mutation_number ?? "—"}{result.summary.mutation_date ? ` (${result.summary.mutation_date})` : ""}</dd>
                  </div>
                  <div><dt className={dt}>{t("Verified")}</dt><dd>{fmt(result.summary.verified_at)} · {result.summary.verified_by}</dd></div>
                </dl>
              </div>
            )}

            {result.certificate && (
              <div className="gov-card p-5 grid sm:grid-cols-[1fr_150px] gap-4">
                <dl className="space-y-2 text-xs min-w-0">
                  <div><dt className={dt}>{t("Certified")}</dt><dd>{fmt(result.certificate.certified_at)} · {t("Version {n}", { n: result.certificate.version })}</dd></div>
                  <div><dt className={dt}>{t("Record hash (SHA-256)")}</dt><dd className="font-mono break-all">{result.certificate.record_hash}</dd></div>
                  <div>
                    <dt className={dt}>{t("Signature ({algorithm}, key {key})", { algorithm: "Ed25519", key: result.certificate.key_id })}</dt>
                    <dd className="font-mono break-all">{result.certificate.signature}</dd>
                  </div>
                </dl>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/public/qr/${recordId}`} alt={t("Verification QR code")} className="w-[150px] h-[150px] mx-auto" />
              </div>
            )}
            <details className="text-xs text-[var(--gov-text-muted)] print:hidden">
              <summary className="cursor-pointer">{t("Department public key (for independent verification)")}</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all font-mono">{result.public_key.pem}</pre>
            </details>
          </>
        )}
      </main>
      <div className="print:hidden">
        <GovFooter />
      </div>
    </div>
  );
}
