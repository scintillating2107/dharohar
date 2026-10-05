"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { useLocale } from "@/contexts/LocaleContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { LoadingState } from "@/components/ui/States";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/utils";
import type { LandRecord, PaginatedResponse } from "@/types";
import { ShieldCheck, ShieldAlert } from "lucide-react";

interface ChainResult {
  valid: boolean;
  checked: number;
  brokenAtSeq?: number;
  head: string | null;
}

/** Certified records and integrity of the audit hash chain. */
export default function CertificatesPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [page, setPage] = useState(1);
  const [lookup, setLookup] = useState("");
  const [runCheck, setRunCheck] = useState(0);
  const { data, initialLoading } = useApi<PaginatedResponse<LandRecord>>(`/api/records?status=VERIFIED&pageSize=15&page=${page}`);
  const chain = useApi<ChainResult>(runCheck ? `/api/audit/verify?run=${runCheck}` : null);

  return (
    <AppLayout title="Certificates">
      <div className="space-y-6 max-w-5xl">
        <PageTitle
          title="Certificates & integrity"
          description="Approved records are hashed (SHA-256) and signed with the department’s Ed25519 key. The signature, the scan’s hash and the hash-chained audit log can be re-checked at any time, by anyone with the QR code."
        />

        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Verify a record">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (lookup.trim()) router.push(`/records/${encodeURIComponent(lookup.trim())}?tab=certification`);
              }}
            >
              <Input placeholder={t("Record ID, e.g. LR-2026-000001")} value={lookup} onChange={(e) => setLookup(e.target.value)} />
              <Button type="submit">{t("Check")}</Button>
            </form>
          </Card>
          <Card title="Audit chain integrity">
            {chain.data ? (
              <div className="flex gap-3 items-start">
                {chain.data.valid ? <ShieldCheck className="h-8 w-8 text-[var(--gov-green)]" /> : <ShieldAlert className="h-8 w-8 text-red-600" />}
                <div className="text-sm">
                  <p className="font-semibold">{chain.data.valid ? t("Intact") : t("Broken at entry #{n}", { n: chain.data.brokenAtSeq ?? "?" })}</p>
                  <p className="text-[var(--gov-text-muted)]">{t("{n} entries re-hashed", { n: chain.data.checked })}</p>
                  {chain.data.head && <p className="font-mono text-[10px] break-all mt-1">{t("Head")}: {chain.data.head}</p>}
                </div>
              </div>
            ) : chain.loading ? (
              <LoadingState message="Re-hashing audit log…" />
            ) : (
              <p className="text-sm text-[var(--gov-text-muted)]">{t("Recompute every audit entry’s hash to detect tampering.")}</p>
            )}
            <Button className="mt-3" size="sm" variant="outline" onClick={() => setRunCheck((n) => n + 1)}>
              {t("Verify audit chain")}
            </Button>
          </Card>
        </div>

        <Card title="Certified records">
          {initialLoading ? (
            <LoadingState />
          ) : (
            <>
              <DataTable
                keyField="record_id"
                data={data?.items ?? []}
                columns={[
                  { key: "record_id", header: "Record", render: (r) => <span className="font-mono text-xs">{r.record_id}</span> },
                  { key: "owner_name", header: "Owner" },
                  { key: "village", header: "Village", render: (r) => `${t(r.village)}, ${t(r.district)}` },
                  { key: "certified", header: "Certified", render: (r) => (r.certificate ? formatDate(r.certificate.certified_at) : "—") },
                  { key: "hash", header: "Record hash", render: (r) => <span className="font-mono text-[10px]">{r.certificate?.record_hash.slice(0, 16)}…</span> },
                  { key: "badge", header: "", render: (r) => (r.certificate ? <Badge variant="success">{t("Signed")}</Badge> : <Badge variant="neutral">{t("Unsigned")}</Badge>) },
                  {
                    key: "public",
                    header: "",
                    render: (r) => (
                      <Link href={`/verify/${r.record_id}`} target="_blank" onClick={(e) => e.stopPropagation()} className="text-xs font-semibold text-[var(--gov-navy-light)]">
                        {t("Public page")}
                      </Link>
                    ),
                  },
                ]}
                onRowClick={(r) => router.push(`/records/${r.record_id}?tab=certification`)}
                emptyTitle="No certified records yet"
                emptyDescription="Records are certified when a verification officer approves them."
              />
              {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />}
            </>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
