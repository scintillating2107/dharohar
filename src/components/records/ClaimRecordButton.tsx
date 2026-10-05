"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Select, TextArea } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { apiPost } from "@/lib/api-client";
import { useToast } from "@/contexts/ToastContext";
import { useLocale } from "@/contexts/LocaleContext";
import { UserCheck } from "lucide-react";

const RELATIONSHIPS = ["Owner", "Co-owner", "Legal heir", "Power of attorney holder", "Lessee"];

/** Citizen asks to be linked to a land record; an officer reviews the claim. */
export function ClaimRecordButton({ recordId, onDone }: { recordId?: string; onDone?: () => void }) {
  const { toast } = useToast();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ recordId: recordId ?? "", relationship: RELATIONSHIPS[0], note: "" });

  const submit = async () => {
    setBusy(true);
    try {
      await apiPost("/api/claims", form);
      toast("Claim submitted for officer review", "success");
      setOpen(false);
      onDone?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not submit claim", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button size="sm" variant={recordId ? "outline" : "primary"} onClick={() => setOpen(true)}>
        <UserCheck className="h-4 w-4" /> {recordId ? t("This is my land") : t("Claim a land record")}
      </Button>
      <Modal
        open={open}
        title="Claim a land record"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            <Button onClick={submit} loading={busy} disabled={!form.recordId.trim()}>{t("Submit claim")}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Record ID" hint="Shown on the record page and certificate, e.g. LR-2026-000001">
            <Input value={form.recordId} disabled={Boolean(recordId)} onChange={(e) => setForm({ ...form, recordId: e.target.value })} />
          </Field>
          <Field label="Your relationship to the land">
            <Select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
              {RELATIONSHIPS.map((r) => <option key={r} value={r}>{t(r)}</option>)}
            </Select>
          </Field>
          <Field label="Supporting details" hint="E.g. khatauni copy reference, mutation order, Aadhaar-linked land ID">
            <TextArea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={1000} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
