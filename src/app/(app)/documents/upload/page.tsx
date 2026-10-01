"use client";



import { useState } from "react";

import { useRouter } from "next/navigation";

import Link from "next/link";

import { AppLayout } from "@/components/layout/AppLayout";

import { DocumentUploader } from "@/components/documents/DocumentUploader";

import { Card } from "@/components/ui/Card";

import { Button } from "@/components/ui/Button";

import { useToast } from "@/contexts/ToastContext";

import { useAuth } from "@/contexts/AuthContext";

import { apiUpload } from "@/lib/api-client";

import { ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE_MB } from "@/lib/config";

import type { UploadResult } from "@/types";

import { Upload } from "lucide-react";



const RECORD_TYPES = ["Khatauni / Record of Rights", "Mutation register", "Sale deed scan", "Survey map", "Other"];

const DISTRICTS = ["Lucknow", "Kanpur", "Agra", "Varanasi", "Prayagraj"];

const TEHSILS = ["Sadar", "Mohanlalganj", "Bakshi Ka Talab"];

const VILLAGES = ["चिनहट", "Gomti Nagar", "Alambagh", "Indira Nagar"];

const SOURCE_OFFICES = ["Tehsildar office", "Sub-registrar", "Revenue inspector", "Survey settlement"];



export default function UploadPage() {

  const [loading, setLoading] = useState(false);

  const [file, setFile] = useState<File | null>(null);

  const [documentName, setDocumentName] = useState("");

  const [recordType, setRecordType] = useState(RECORD_TYPES[0]);

  const [state, setState] = useState("Uttar Pradesh");

  const [district, setDistrict] = useState("Lucknow");

  const [tehsil, setTehsil] = useState(TEHSILS[0]);

  const [village, setVillage] = useState(VILLAGES[0]);

  const [recordYear, setRecordYear] = useState(String(new Date().getFullYear() - 1));

  const [sourceOffice, setSourceOffice] = useState(SOURCE_OFFICES[0]);

  const [language, setLanguage] = useState("auto");

  const [description, setDescription] = useState("");

  const [priority, setPriority] = useState<"normal" | "urgent">("normal");

  const { toast } = useToast();

  const { user } = useAuth();

  const router = useRouter();



  const handleFileSelect = (f: File) => {

    setFile(f);

    if (!documentName) setDocumentName(f.name.replace(/\.[^.]+$/, ""));

  };



  const submit = async () => {

    if (!file) {

      toast("Select a file to upload", "error");

      return;

    }

    setLoading(true);

    try {

      const formData = new FormData();

      formData.append("file", file);

      formData.append("district", district || user?.district || "Lucknow");

      formData.append("state", state);

      formData.append("name", documentName || file.name);
      formData.append("tehsil", tehsil);
      formData.append("village", village);
      formData.append("recordYear", recordYear);
      formData.append("recordType", recordType);
      formData.append("sourceOffice", sourceOffice);
      formData.append("language", language);
      formData.append("description", description);
      formData.append("priority", priority);

      const result = await apiUpload<UploadResult>("/api/documents", formData);

      toast("Document uploaded — review quality next", "success");

      router.push(`/documents/${result.document.id}/quality`);

    } catch (err) {

      toast(err instanceof Error ? err.message : "Upload failed", "error");

    } finally {

      setLoading(false);

    }

  };



  const selectClass =

    "mt-1.5 w-full rounded-md border border-[var(--gov-border)] px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-[var(--gov-navy-light)]/20";



  return (

    <AppLayout title="Upload land records">

      <div className="space-y-8 max-w-3xl mx-auto">

        <div>

          <h1 className="text-2xl font-bold text-[var(--gov-navy)]">Upload land records</h1>

          <p className="text-sm text-[var(--gov-text-muted)] mt-1">

            Starting point of the workflow — upload, then preview quality before AI processing.

          </p>

        </div>



        <Card>

          <DocumentUploader
            onUpload={async () => {}}
            selectOnly
            onFileSelected={handleFileSelect}
            loading={false}
          />

          <p className="text-xs text-center text-[var(--gov-text-muted)] mt-2">

            {ALLOWED_FILE_EXTENSIONS.join(" · ").toUpperCase()} · Max {MAX_FILE_SIZE_MB} MB

          </p>

        </Card>



        {file && (

          <Card title="Document metadata">

            <div className="grid sm:grid-cols-2 gap-4">

              <label className="block text-sm sm:col-span-2">

                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)]">Document name</span>

                <input value={documentName} onChange={(e) => setDocumentName(e.target.value)} className={selectClass} />

              </label>

              <label className="block text-sm">

                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)]">Record type</span>

                <select value={recordType} onChange={(e) => setRecordType(e.target.value)} className={selectClass}>

                  {RECORD_TYPES.map((t) => <option key={t}>{t}</option>)}

                </select>

              </label>

              <label className="block text-sm">

                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)]">State</span>

                <input value={state} onChange={(e) => setState(e.target.value)} className={selectClass} />

              </label>

              <label className="block text-sm">

                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)]">District</span>

                <select value={district} onChange={(e) => setDistrict(e.target.value)} className={selectClass}>

                  {DISTRICTS.map((d) => <option key={d}>{d}</option>)}

                </select>

              </label>

              <label className="block text-sm">

                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)]">Tehsil</span>

                <select value={tehsil} onChange={(e) => setTehsil(e.target.value)} className={selectClass}>

                  {TEHSILS.map((t) => <option key={t}>{t}</option>)}

                </select>

              </label>

              <label className="block text-sm">

                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)]">Village</span>

                <select value={village} onChange={(e) => setVillage(e.target.value)} className={selectClass}>

                  {VILLAGES.map((v) => <option key={v}>{v}</option>)}

                </select>

              </label>

              <label className="block text-sm">

                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)]">Record year</span>

                <input type="number" value={recordYear} onChange={(e) => setRecordYear(e.target.value)} className={selectClass} />

              </label>

              <label className="block text-sm">

                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)]">Source office</span>

                <select value={sourceOffice} onChange={(e) => setSourceOffice(e.target.value)} className={selectClass}>

                  {SOURCE_OFFICES.map((o) => <option key={o}>{o}</option>)}

                </select>

              </label>

              <label className="block text-sm">

                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)]">Language</span>

                <select value={language} onChange={(e) => setLanguage(e.target.value)} className={selectClass}>

                  <option value="auto">Auto-detect</option>

                  <option value="hi">Hindi</option>

                  <option value="en">English</option>

                </select>

              </label>

              <label className="block text-sm">

                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)]">Priority</span>

                <select value={priority} onChange={(e) => setPriority(e.target.value as "normal" | "urgent")} className={selectClass}>

                  <option value="normal">Normal</option>

                  <option value="urgent">Urgent</option>

                </select>

              </label>

              <label className="block text-sm sm:col-span-2">

                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)]">Document description</span>

                <textarea

                  value={description}

                  onChange={(e) => setDescription(e.target.value)}

                  rows={3}

                  className={selectClass}

                  placeholder="Optional notes for officers"

                />

              </label>

            </div>



            <Button className="mt-6 w-full" size="lg" loading={loading} onClick={submit}>

              <Upload className="h-4 w-4" /> Start AI processing

            </Button>

            <p className="text-xs text-center text-[var(--gov-text-muted)] mt-3">

              You will review document quality before the pipeline runs.

            </p>

          </Card>

        )}



        <p className="text-center text-xs text-[var(--gov-text-light)]">

          <Link href="/demo/workflow" className="text-[var(--gov-navy-light)] font-semibold hover:underline">

            View guided workflow

          </Link>

        </p>

      </div>

    </AppLayout>

  );

}


