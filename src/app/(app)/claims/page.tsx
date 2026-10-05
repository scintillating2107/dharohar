"use client";

import { useState } from "react";
import Link from "next/link";
import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { useLocale } from "@/contexts/LocaleContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select, TextArea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/States";
import { useApi } from "@/lib/use-api";
import { apiPost } from "@/lib/api-client";
import { useToast } from "@/contexts/ToastContext";
import { formatDate } from "@/lib/utils";
import type { CitizenClaim } from "@/types";

type Claim = CitizenClaim & { ownerName: string | null; village: string | null };

export default function ClaimsPage() {
  const { toast } = useToast();
  const { t } = useLocale();
  const [status, setStatus] = useState("PENDING");
  const { data, initialLoading, reload } = useApi<{ items: Claim[] }>(`/api/claims${status ? `?status=${status}` : ""}`);
  const [deciding, setDeciding] = useState<{ claim: Claim; decision: "APPROVED" | "REJECTED" } | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const decide = async () => {
    if (!deciding) return;
    setBusy(true);
    try {
      await apiPost(`/api/claims/${deciding.claim.id}`, { decision: deciding.decision, comment });
      toast(deciding.decision === "APPROVED" ? t("Claim approved") : t("Claim rejected"), "success");
      setDeciding(null);
      setComment("");
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not record decision", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout title="Ownership claims">
      <div className="space-y-6 max-w-5xl">
        <PageTitle
          title="Ownership claims"
          description="Citizens ask to be linked to a record. Check the claim against the record of rights before approving — approval gives the citizen access to that record in their portal."
          actions={
            <Select className="max-w-[200px]" aria-label={t("Status")} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="PENDING">{t("Pending")}</option>
              <option value="APPROVED">{t("Approved")}</option>
              <option value="REJECTED">{t("Rejected")}</option>
              <option value="">{t("All")}</option>
            </Select>
          }
        />
        <Card>
          {initialLoading ? (
            <LoadingState />
          ) : !data?.items.length ? (
            <p className="text-sm text-[var(--gov-text-muted)] py-6 text-center">{t("No claims.")}</p>
          ) : (
            <ul className="divide-y divide-[var(--gov-border-light)]">
              {data.items.map((c) => (
                <li key={c.id} className="py-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="text-sm">
                    <p>
                      <strong>{c.userName}</strong> · <strong>{t(c.relationship)}</strong> ·{" "}
                      <Link href={`/records/${c.recordId}`} className="font-mono text-[var(--gov-navy-light)]">{c.recordId}</Link>
                    </p>
                    <p className="text-xs text-[var(--gov-text-muted)]">
                      {t("Recorded owner")}: {c.ownerName ?? "—"}{c.village ? ` · ${t(c.village)}` : ""} · {t("Submitted {date}", { date: formatDate(c.createdAt) })}
                    </p>
                    {c.note && <p className="text-xs mt-1">“{c.note}”</p>}
                    {c.reviewComment && <p className="text-xs mt-1 text-[var(--gov-text-muted)]">{t("Review")}: {c.reviewComment} ({c.reviewedBy})</p>}
                  </div>
                  {c.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setDeciding({ claim: c, decision: "APPROVED" })}>{t("Approve")}</Button>
                      <Button size="sm" variant="danger" onClick={() => setDeciding({ claim: c, decision: "REJECTED" })}>{t("Reject")}</Button>
                    </div>
                  ) : (
                    <Badge variant={c.status === "APPROVED" ? "success" : "error"}>{t(c.status === "APPROVED" ? "Approved" : "Rejected")}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Modal
        open={Boolean(deciding)}
        title={deciding?.decision === "APPROVED" ? "Approve claim" : "Reject claim"}
        onClose={() => setDeciding(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeciding(null)}>{t("Cancel")}</Button>
            <Button
              variant={deciding?.decision === "REJECTED" ? "danger" : "primary"}
              loading={busy}
              disabled={deciding?.decision === "REJECTED" && !comment.trim()}
              onClick={decide}
            >
              {t("Confirm")}
            </Button>
          </>
        }
      >
        <TextArea aria-label={t("Comment")} placeholder={deciding?.decision === "REJECTED" ? t("Reason (required)") : t("Note (optional)")} value={comment} onChange={(e) => setComment(e.target.value)} />
      </Modal>
    </AppLayout>
  );
}
