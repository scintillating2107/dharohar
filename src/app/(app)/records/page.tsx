"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Field";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { RecordStatusBadge } from "@/components/ui/StatusBadges";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { formatArea, formatConfidence } from "@/lib/utils";
import type { LandRecord, PaginatedResponse } from "@/types";
import { Download, Search } from "lucide-react";

function RecordsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLocale();
  const isCitizen = user?.role === "CITIZEN";
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [query, setQuery] = useState(params.get("search") ?? "");
  const [district, setDistrict] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [page, setPage] = useState(1);

  const qs = new URLSearchParams({ pageSize: "15", page: String(page) });
  if (query) qs.set("search", query);
  if (status) qs.set("status", status);
  if (district) qs.set("district", district);
  const { data, error, initialLoading, reload } = useApi<PaginatedResponse<LandRecord>>(`/api/records?${qs}`);
  const districts = useApi<{ districts: string[] }>("/api/meta/locations").data?.districts ?? [];
  const filtered = Boolean(query || status || district);

  return (
    <div>
      <PageTitle
        title="Land records"
        description={isCitizen ? "Verified public records and the records linked to you." : "All digitized records with their current version."}
        actions={
          !isCitizen ? (
            <a href={`/api/v1/export?format=csv${district ? `&district=${encodeURIComponent(district)}` : ""}`}>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" /> {t("Export verified (CSV)")}
              </Button>
            </a>
          ) : undefined
        }
      />

      <form
        className="grid grid-cols-2 md:flex md:flex-wrap gap-2 mb-5"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <Input className="col-span-2 md:max-w-sm" placeholder={t("Record ID, owner, khasra, khata, village...")} aria-label={t("Search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select className="md:max-w-[200px]" value={district} aria-label={t("District")} onChange={(e) => { setDistrict(e.target.value); setPage(1); }}>
          <option value="">{t("All districts")}</option>
          {districts.map((d) => (
            <option key={d} value={d}>{t(d)}</option>
          ))}
        </Select>
        {!isCitizen && (
          <Select className="md:max-w-[200px]" value={status} aria-label={t("Status")} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">{t("All statuses")}</option>
            <option value="VERIFIED">{t("Verified")}</option>
            <option value="VERIFICATION_REQUIRED">{t("Under review")}</option>
            <option value="REJECTED">{t("Rejected")}</option>
          </Select>
        )}
        <Button type="submit" variant="outline">
          <Search className="h-4 w-4" /> {t("Search")}
        </Button>
      </form>

      {initialLoading ? (
        <LoadingState />
      ) : !data ? (
        <ErrorState message={error || "Could not load records"} onRetry={reload} />
      ) : (
        <>
          <DataTable
            keyField="record_id"
            data={data.items}
            columns={[
              {
                key: "record_id",
                header: "Record",
                render: (r) => (
                  <span>
                    <span className="block font-medium">{r.owner_name || "—"}</span>
                    <span className="block font-mono text-[11px] text-[var(--gov-text-muted)]">{r.record_id}</span>
                  </span>
                ),
              },
              { key: "khasra_number", header: "Khasra", render: (r) => r.khasra_number || "—" },
              { key: "village", header: "Village", render: (r) => [r.village, r.district].filter(Boolean).map((p) => t(p as string)).join(", ") || "—" },
              { key: "area", header: "Area", render: (r) => formatArea(r.area, t(r.area_unit)) },
              { key: "status", header: "Status", render: (r) => <RecordStatusBadge status={r.status} /> },
              ...(isCitizen ? [] : [{ key: "confidence", header: "Confidence", render: (r: LandRecord) => formatConfidence(r.averageConfidence) }]),
            ]}
            onRowClick={(r) => router.push(`/records/${r.record_id}`)}
            emptyTitle={filtered ? "No records match these filters" : "No records yet"}
            emptyDescription={filtered ? "Try a different search." : "Records appear here after documents are processed."}
          />
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function RecordsKeyed() {
  const params = useSearchParams();
  return <RecordsContent key={`${params.get("search") ?? ""}|${params.get("status") ?? ""}`} />;
}

export default function RecordsPage() {
  return (
    <AppLayout title="Land records">
      <Suspense fallback={<LoadingState />}>
        <RecordsKeyed />
      </Suspense>
    </AppLayout>
  );
}
