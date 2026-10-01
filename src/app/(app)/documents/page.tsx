"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { ProcessingStatusBadge } from "@/components/ui/StatusBadges";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-client";
import { formatDateShort, formatFileSize } from "@/lib/utils";
import type { Document, PaginatedResponse } from "@/types";
import { Upload, Eye, FileText } from "lucide-react";
import { DashboardHero } from "@/components/dashboard/DashboardHero";

export default function DocumentsPage() {
  const [data, setData] = useState<PaginatedResponse<Document> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const router = useRouter();

  const load = async (q?: string, p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "10", page: String(p) });
      if (q) params.set("search", q);
      const result = await apiGet<PaginatedResponse<Document>>(`/api/documents?${params}`);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(search, page); }, [page]);

  return (
    <AppLayout title="Documents">
      <div className="space-y-6">
        <DashboardHero
          eyebrow="Document repository"
          title="Upload queue"
          description="Active uploads and processing jobs. Browse the full digital archive under Document repository (land records)."
          icon={FileText}
          accent="blue"
          actions={[
            { href: "/documents/upload", label: "Upload", icon: Upload },
            { href: "/records", label: "Repository", variant: "outline" as const },
          ]}
        />
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2 flex-1 max-w-md">
            <Input
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load(search, 1); } }}
            />
            <Button variant="outline" onClick={() => { setPage(1); load(search, 1); }}>Search</Button>
          </div>
          <Link href="/documents/upload">
            <Button><Upload className="h-4 w-4" /> Upload Document</Button>
          </Link>
        </div>

        {loading ? (
          <LoadingState />
        ) : !data ? (
          <ErrorState message="Failed to load documents" onRetry={() => load(search, page)} />
        ) : (
          <>
            <DataTable
              keyField="id"
              data={data.items}
              columns={[
                { key: "id", header: "Document ID" },
                { key: "name", header: "Name", render: (d) => <span className="max-w-[200px] truncate block">{d.name}</span> },
                { key: "fileSize", header: "Size", render: (d) => formatFileSize(d.fileSize) },
                { key: "pageCount", header: "Pages" },
                { key: "status", header: "Status", render: (d) => <ProcessingStatusBadge status={d.status} /> },
                { key: "uploadedAt", header: "Uploaded", render: (d) => formatDateShort(d.uploadedAt) },
                {
                  key: "actions",
                  header: "",
                  render: (d) => (
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/documents/${d.id}`); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  ),
                },
              ]}
              onRowClick={(d) => router.push(`/documents/${d.id}`)}
              emptyTitle="No documents found"
              emptyDescription="Upload a land record document to get started."
            />
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={data.pageSize}
              onPageChange={(p) => setPage(p)}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
