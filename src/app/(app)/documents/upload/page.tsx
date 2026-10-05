"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field, Select, TextArea } from "@/components/ui/Field";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { apiUpload } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DOCUMENT_LANGUAGES } from "@/lib/config";
import type { Document } from "@/types";
import { Upload } from "lucide-react";

const RECORD_TYPES = [
  "Khatauni / Record of Rights",
  "Jamabandi",
  "Khasra register",
  "Mutation order",
  "Sale deed",
  "Survey / settlement record",
  "Other",
];
const SOURCE_OFFICES = ["Tehsil office", "Sub-registrar", "Revenue inspector", "Survey & settlement", "District record room"];

interface Locations {
  states: string[];
  districts: string[];
  tehsils: string[];
  villages: string[];
}

export default function UploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLocale();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState({
    name: "",
    recordType: RECORD_TYPES[0],
    state: "Uttar Pradesh",
    district: user?.district ?? "",
    tehsil: "",
    village: "",
    recordYear: "",
    sourceOffice: SOURCE_OFFICES[0],
    language: "auto",
    description: "",
    priority: "normal",
    autoProcess: true,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const locations = useApi<Locations>(
    `/api/meta/locations?state=${encodeURIComponent(form.state)}${form.district ? `&district=${encodeURIComponent(form.district)}` : ""}`
  ).data;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast("Choose a file to upload", "error");
      return;
    }
    if (form.recordYear && !/^(1[89]|20)\d{2}$/.test(form.recordYear)) {
      toast("Record year must be a 4-digit year", "error");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      for (const [key, value] of Object.entries(form)) fd.append(key, String(value));
      if (!form.name) fd.set("name", file.name.replace(/\.[^.]+$/, ""));
      const result = await apiUpload<{ document: Document; duplicateOf: string | null; message: string }>("/api/documents", fd, setProgress);
      toast(result.message, result.duplicateOf ? "warning" : "success");
      router.push(form.autoProcess ? `/documents/${result.document.id}/processing` : `/documents/${result.document.id}/quality`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <AppLayout title="Upload">
      <form onSubmit={submit} className="space-y-6 max-w-3xl mx-auto">
        <PageTitle title="Upload land record" description="Scanned PDF, photo or TIFF of a khatauni, jamabandi, khasra register or mutation order." />

        <Card title="1. File">
          <DocumentUploader
            file={file}
            disabled={loading}
            progress={loading ? progress : undefined}
            onFileChange={(f) => {
              setFile(f);
              if (f && !form.name) set("name", f.name.replace(/\.[^.]+$/, ""));
            }}
          />
        </Card>

        <Card title="2. Details">
          <p className="text-xs text-[var(--gov-text-muted)] -mt-1 mb-4">
            {t("Location fields help routing and fill gaps when the document does not state them. Everything except the file is optional.")}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Document name">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t("e.g. Khatauni Chinhat 1432F")} />
            </Field>
            <Field label="Record type">
              <Select value={form.recordType} onChange={(e) => set("recordType", e.target.value)}>
                {RECORD_TYPES.map((r) => (
                  <option key={r} value={r}>{t(r)}</option>
                ))}
              </Select>
            </Field>
            <Field label="State">
              <Select value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value, district: "", tehsil: "", village: "" }))}>
                {(locations?.states.length ? locations.states : [form.state]).map((s) => (
                  <option key={s} value={s}>{t(s)}</option>
                ))}
              </Select>
            </Field>
            <Field label="District">
              <Input list="district-options" value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value, tehsil: "", village: "" }))} />
              <datalist id="district-options">
                {locations?.districts.map((d) => <option key={d} value={d} />)}
              </datalist>
            </Field>
            <Field label="Tehsil">
              <Input list="tehsil-options" value={form.tehsil} onChange={(e) => set("tehsil", e.target.value)} />
              <datalist id="tehsil-options">{locations?.tehsils.map((x) => <option key={x} value={x} />)}</datalist>
            </Field>
            <Field label="Village">
              <Input list="village-options" value={form.village} onChange={(e) => set("village", e.target.value)} />
              <datalist id="village-options">{locations?.villages.map((v) => <option key={v} value={v} />)}</datalist>
            </Field>
            <Field label="Record year">
              <Input inputMode="numeric" maxLength={4} value={form.recordYear} onChange={(e) => set("recordYear", e.target.value.replace(/\D/g, ""))} placeholder={t("e.g. 1998")} />
            </Field>
            <Field label="Source office">
              <Select value={form.sourceOffice} onChange={(e) => set("sourceOffice", e.target.value)}>
                {SOURCE_OFFICES.map((s) => (
                  <option key={s} value={s}>{t(s)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Document language" hint="Auto-detect checks the script on each page">
              <Select value={form.language} onChange={(e) => set("language", e.target.value)}>
                {DOCUMENT_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{t(l.label)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                <option value="normal">{t("Normal")}</option>
                <option value="urgent">{t("Urgent (court case / citizen request)")}</option>
              </Select>
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <TextArea value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} />
            </Field>
          </div>
        </Card>

        <div className="gov-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-start gap-2 text-sm text-[var(--gov-navy)]">
            <input type="checkbox" className="mt-1" checked={form.autoProcess} onChange={(e) => set("autoProcess", e.target.checked)} />
            <span>
              {t("Start processing immediately")}
              <span className="block text-xs text-[var(--gov-text-muted)]">{t("Untick to check the scan quality first.")}</span>
            </span>
          </label>
          <Button type="submit" size="lg" loading={loading} disabled={!file}>
            <Upload className="h-4 w-4" /> {form.autoProcess ? t("Upload and process") : t("Upload")}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
