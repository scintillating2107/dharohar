"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { useLocale } from "@/contexts/LocaleContext";
import { CompareRecordsPanel } from "@/components/validation/CompareRecordsPanel";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/States";

function CompareContent() {
  const recordId = useSearchParams().get("recordId");
  const router = useRouter();
  const [id, setId] = useState("");
  const { t } = useLocale();
  return (
    <div className="max-w-4xl space-y-4">
      <PageTitle title="Compare land records" description="Field-by-field differences against earlier versions or related records (same khasra, duplicates)." />
      {recordId ? (
        <CompareRecordsPanel key={recordId} recordId={recordId} />
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (id.trim()) router.push(`/compare?recordId=${encodeURIComponent(id.trim())}`);
          }}
        >
          <Input className="max-w-xs" placeholder={t("Record ID, e.g. LR-2026-000001")} value={id} onChange={(e) => setId(e.target.value)} />
          <Button type="submit">{t("Open")}</Button>
        </form>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <AppLayout title="Compare records">
      <Suspense fallback={<LoadingState />}>
        <CompareContent />
      </Suspense>
    </AppLayout>
  );
}
