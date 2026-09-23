"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiUpload } from "@/lib/api-client";
import type { UploadResult } from "@/types";

export default function UploadPage() {
  const [loading, setLoading] = useState(false);
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("Uttar Pradesh");
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const handleUpload = async (file: File, onProgress?: (p: number) => void, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("district", district || user?.district || "Lucknow");
      formData.append("state", state);
      const result = await apiUpload<UploadResult>("/api/documents", formData, onProgress, signal);
      toast("Document uploaded successfully", "success");
      router.push(`/documents/${result.document.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Upload Document">
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          title="Upload Land Record"
          description="Upload a real scanned document to start the digitization pipeline. Use descriptive filenames like Land_Record_Chinhat_235-1.pdf for better field detection."
        />

        <Card title="Document Details">
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <label className="block text-sm">
              <span className="text-[var(--gov-text-muted)]">District</span>
              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder={user?.district || "Lucknow"}
                className="mt-1 w-full rounded-md border border-[var(--gov-border)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-[var(--gov-text-muted)]">State</span>
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--gov-border)] px-3 py-2 text-sm"
              />
            </label>
          </div>

          <DocumentUploader onUpload={handleUpload} loading={loading} />
        </Card>
      </div>
    </AppLayout>
  );
}
