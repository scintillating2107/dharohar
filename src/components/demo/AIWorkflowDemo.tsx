"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DemoTimelineBar } from "@/components/demo/DemoTimelineBar";
import { DemoControls } from "@/components/demo/DemoControls";
import { Button } from "@/components/ui/Button";
import { RecordIdLink } from "@/components/records/RecordIdLink";
import { DEMO_LAST_STEP_INDEX, DEMO_RECORD_ID, DEMO_STEP_LABELS } from "@/lib/demo-workflow";
import { LandRecordImagePair } from "@/components/demo/LandRecordImagePair";
import { DEMO_LAND_RECORD_AFTER, DEMO_LAND_RECORD_BEFORE, DEMO_UPLOAD_FILENAME } from "@/lib/demo-assets";
import { DEMO_CREDENTIALS } from "@/lib/config";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Check,
  FileText,
  Loader2,
  MapPin,
  Sparkles,
  Upload,
  UserPlus,
} from "lucide-react";

type Phase = "landing" | "run";

export function AIWorkflowDemo() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [step, setStep] = useState(0);
  const [accountPhase, setAccountPhase] = useState(3);
  const [uploadDone, setUploadDone] = useState(false);
  const [processPhase, setProcessPhase] = useState(0);
  const [quality, setQuality] = useState(48);
  const [ocrVisible, setOcrVisible] = useState(0);
  const [extractPhase, setExtractPhase] = useState(0);
  const [areaValue, setAreaValue] = useState("1.80");
  const [editingArea, setEditingArea] = useState(false);
  const [verified, setVerified] = useState(false);
  const [storageTicks, setStorageTicks] = useState(0);
  const [gisZoom, setGisZoom] = useState(false);
  const [certShown, setCertShown] = useState(false);

  const applyStepView = useCallback((s: number) => {
    setAccountPhase(3);
    setUploadDone(s !== 1);
    setProcessPhase(s >= 2 ? 4 : 0);
    setQuality(s >= 2 ? 84 : 48);
    setOcrVisible(s >= 3 ? 4 : 0);
    setExtractPhase(s >= 4 ? 3 : 0);
    setStorageTicks(s >= 7 ? 7 : 0);
    setGisZoom(s >= 8);
    setCertShown(s >= 9);
    if (s < 6) {
      setVerified(false);
      setEditingArea(false);
      setAreaValue("1.80");
    }
  }, []);

  useEffect(() => {
    if (phase === "run") applyStepView(step);
  }, [phase, step, applyStepView]);

  const start = () => {
    setPhase("run");
    setStep(0);
    applyStepView(0);
  };

  if (phase === "landing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="gov-card max-w-lg w-full p-8 sm:p-10 shadow-lg">
          <h1 className="text-2xl font-bold text-[var(--gov-navy)]">Start presentation</h1>
          <p className="text-[var(--gov-text-muted)] mt-3 text-sm leading-relaxed">
            Walk screen by screen with Continue — sign-up, upload, enhancement, OCR, verification, map, and certificate.
          </p>
          <Button className="mt-8 w-full" size="lg" onClick={start}>
            Begin walkthrough
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--gov-text-muted)]">Workflow walkthrough</p>
          <p className="text-lg font-semibold text-[var(--gov-navy)]">{DEMO_STEP_LABELS[step]}</p>
          <RecordIdLink recordId={DEMO_RECORD_ID} className="text-sm" />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setPhase("landing")}>
          Exit
        </Button>
      </div>

      <div className="flex-1 gov-card p-4 sm:p-6 mb-3 overflow-y-auto max-h-[min(70vh,720px)]">
        {step === 0 && <StepAccount phase={accountPhase} />}
        {step === 1 && <StepUpload done={uploadDone} onUpload={() => setUploadDone(true)} />}
        {step === 2 && <StepProcessing phase={processPhase} quality={quality} />}
        {step === 3 && <StepOcr visible={ocrVisible} />}
        {step === 4 && <StepExtract phase={extractPhase} />}
        {step === 5 && <StepValidation />}
        {step === 6 && (
          <StepVerification
            area={areaValue}
            editing={editingArea}
            verified={verified}
            onEdit={() => setEditingArea(true)}
            onAreaChange={setAreaValue}
            onAccept={() => setAreaValue("1.80")}
            onApprove={() => setVerified(true)}
          />
        )}
        {step === 7 && <StepStorage ticks={storageTicks} />}
        {step === 8 && <StepGis zoom={gisZoom} area={areaValue} />}
        {step === 9 && <StepCert show={certShown} />}
        {step === 10 && <StepFinal area={areaValue} />}
      </div>

      <DemoTimelineBar stepIndex={step} />
      <DemoControls
        stepIndex={step}
        continueDisabled={(step === 1 && !uploadDone) || (step === 6 && !verified)}
        continueHint={
          step === 1 && !uploadDone
            ? "Upload the document above, then tap Continue."
            : step === 6 && !verified
              ? "Approve the record above, then tap Continue."
              : undefined
        }
        onPrev={() => setStep((s) => Math.max(0, s - 1))}
        onNext={() => setStep((s) => Math.min(DEMO_LAST_STEP_INDEX, s + 1))}
        onStepClick={setStep}
      />
    </div>
  );
}

function StepAccount({ phase }: { phase: number }) {
  const citizen = DEMO_CREDENTIALS.find((c) => c.role === "CITIZEN");
  const officer = DEMO_CREDENTIALS.find((c) => c.role === "DATA_OFFICER");
  const lines = [
    { title: "Citizen registers", detail: "Ramesh Singh · citizen portal · Lucknow" },
    { title: "Citizen signs in", detail: citizen ? citizen.email : "citizen@dharohar.gov" },
    { title: "Data officer signs in", detail: officer ? `${officer.email} · upload & AI pipeline` : "data@dharohar.gov" },
  ];
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-[var(--gov-navy)]">Sign up & sign in</h2>
      <p className="text-sm text-[var(--gov-text-muted)]">
        Citizens create an account to track holdings; revenue staff use department credentials for digitization.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-lg border p-5 bg-[var(--gov-bg-subtle)]">
          <UserPlus className="h-8 w-8 text-[var(--gov-saffron)] mb-3" />
          <p className="font-semibold text-[var(--gov-navy)]">Citizen registration</p>
          <p className="text-xs text-[var(--gov-text-muted)] mt-2">Name, email, password → citizen dashboard</p>
          <Link href="/register" className="inline-block mt-4">
            <Button size="sm" variant="outline">Open registration</Button>
          </Link>
        </div>
        <div className="rounded-lg border p-5">
          <p className="font-semibold text-[var(--gov-navy)]">Officer sign-in</p>
          <p className="text-xs text-[var(--gov-text-muted)] mt-2">Training accounts on the login page</p>
          <Link href="/login" className="inline-block mt-4">
            <Button size="sm" variant="outline">Open sign-in</Button>
          </Link>
        </div>
      </div>
      <ul className="space-y-3">
        {lines.map((line, i) => (
          <li
            key={line.title}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-opacity",
              i < phase ? "border-[var(--gov-green)] bg-green-50/40" : "opacity-50"
            )}
          >
            {i < phase ? <Check className="h-5 w-5 text-[var(--gov-green)] shrink-0 mt-0.5" /> : <Loader2 className="h-5 w-5 animate-spin shrink-0 mt-0.5" />}
            <div>
              <p className="font-semibold text-[var(--gov-navy)]">{line.title}</p>
              <p className="text-[var(--gov-text-muted)]">{line.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      {phase >= 3 && (
        <p className="text-center text-[var(--gov-green)] font-semibold flex items-center justify-center gap-2">
          <Check className="h-5 w-5" /> Ready to upload legacy register scan
        </p>
      )}
    </div>
  );
}

function StepUpload({ done, onUpload }: { done: boolean; onUpload: () => void }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-[var(--gov-navy)]">Upload land record</h2>
      <div className="rounded-lg border border-[var(--gov-border)] p-6 bg-[var(--gov-bg-subtle)]">
        <p className="text-sm font-semibold text-[var(--gov-navy)] mb-4">Sample document</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative w-full sm:w-36 aspect-[3/4] rounded border overflow-hidden bg-slate-200 shrink-0">
            <Image src={DEMO_LAND_RECORD_BEFORE} alt="Upload preview" fill className="object-cover" sizes="144px" />
          </div>
          <div className="flex items-center gap-3 text-sm flex-1">
            <FileText className="h-10 w-10 text-[var(--gov-navy-light)] hidden sm:block" />
            <div>
              <p className="font-mono font-medium">{DEMO_UPLOAD_FILENAME}</p>
              <p className="text-[var(--gov-text-muted)]">Language: Auto detect · Pages: 3</p>
              <p className="text-[var(--gov-text-muted)]">Source: Revenue Department · District: Lucknow</p>
            </div>
          </div>
        </div>
        <Button className="mt-6 w-full" disabled={done} onClick={onUpload}>
          <Upload className="h-4 w-4" /> Upload document
        </Button>
      </div>
      {done && (
        <p className="text-center text-[var(--gov-green)] font-semibold flex items-center justify-center gap-2">
          <Check className="h-5 w-5" /> Uploaded — tap Continue for image enhancement
        </p>
      )}
      {!done && (
        <p className="text-center text-xs text-[var(--gov-text-muted)]">Click Upload, then Continue.</p>
      )}
    </div>
  );
}

function StepProcessing({ phase, quality }: { phase: number; quality: number }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-[var(--gov-navy)]">Image enhancement</h2>
      <LandRecordImagePair
        compact
        showAfter
        labelBefore="Before — faded, tilted scan"
        labelAfter="After — rotation, denoise, contrast"
      />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {["Rotation corrected", "Noise reduced", "Contrast enhanced"].map((t, i) => (
          <span key={t} className={cn("flex items-center gap-1.5", phase > i ? "text-[var(--gov-green)]" : "text-[var(--gov-text-light)]")}>
            <Check className="h-4 w-4" /> {t}
          </span>
        ))}
        <span className="font-bold text-[var(--gov-navy)]">
          Quality: <span className="text-amber-700">48%</span> → <span className="text-[var(--gov-green)]">{quality}%</span>
        </span>
      </div>
    </div>
  );
}

function StepOcr({ visible }: { visible: number }) {
  const rows = [
    ["नाम", "राम सिंह"],
    ["खाता नं.", "124"],
    ["खसरा नं.", "235/1"],
    ["क्षेत्रफल", "0.2450 हे."],
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[var(--gov-navy)]">Language + OCR</h2>
      <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm">
        <p className="font-semibold text-[var(--gov-navy)]">Language detection</p>
        <p>Hindi / Devanagari — Confidence: 98%</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border relative overflow-hidden h-[clamp(160px,30vh,260px)] bg-slate-50">
          <Image src={DEMO_LAND_RECORD_AFTER} alt="Enhanced scan for OCR" fill className="object-contain p-1" sizes="50vw" />
          <p className="absolute top-2 left-2 z-10 text-xs bg-white/90 px-2 py-1 rounded font-medium">Scan with OCR boxes</p>
          {rows.slice(0, visible).map(([k, v], i) => (
            <div key={k} className="absolute z-10 border-2 border-blue-500/80 bg-blue-500/15 px-2 py-1 text-sm font-medium shadow-sm" style={{ top: 48 + i * 52, left: 20 }}>
              {v}
            </div>
          ))}
        </div>
        <table className="w-full text-sm border border-[var(--gov-border-light)]">
          <tbody>
            {rows.map(([k, v], i) => (
              <tr key={k} className={cn("border-b", i < visible ? "opacity-100" : "opacity-30")}>
                <td className="p-3 font-medium">{k}</td>
                <td className="p-3">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible >= 4 && <p className="text-center font-semibold text-[var(--gov-navy)]">OCR confidence: 94.2%</p>}
    </div>
  );
}

function StepExtract({ phase }: { phase: number }) {
  const msgs = ["Understanding document…", "Identifying fields…", "Normalizing values…"];
  const fields = [
    { k: "OWNER", v: "राम सिंह", c: "98%" },
    { k: "KHASRA", v: "235/1", c: "99%" },
    { k: "KHATA", v: "124", c: "97%" },
    { k: "AREA", v: "0.2450 ha", c: "68% ⚠", warn: true },
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[var(--gov-navy)]">AI field extraction</h2>
      {phase < 3 ? (
        <p className="flex items-center gap-2 text-[var(--gov-navy-light)]">
          <Sparkles className="h-5 w-5 animate-pulse" /> {msgs[phase]}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.k} className={cn("rounded-lg border p-4", f.warn && "border-amber-300 bg-amber-50/50")}>
              <p className="text-xs font-bold text-[var(--gov-text-muted)]">{f.k}</p>
              <p className="text-lg font-semibold text-[var(--gov-navy)] mt-1">{f.v}</p>
              <p className="text-sm mt-1">{f.c}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepValidation() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-[var(--gov-navy)]">Validation</h2>
      <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-6">
        <p className="font-bold text-amber-900">⚠ Anomaly detected</p>
        <p className="text-sm mt-2">AI extracted area: <strong>1.80 ha</strong></p>
        <p className="text-sm">Historical database: <strong>2.40 ha</strong></p>
        <p className="mt-3 font-semibold text-amber-950">Area changed: 2.40 ha → 1.80 ha · Difference: 0.60 ha</p>
        <p className="text-sm text-amber-800 mt-2">Human verification required.</p>
      </div>
      <div className="rounded-lg border border-[var(--gov-border)] p-4">
        <p className="font-semibold text-[var(--gov-navy)]">⚠ Similar record found</p>
        <p className="text-sm text-[var(--gov-text-muted)] mt-1">Similarity: 93% · Khasra: 235/1 · Village: Chinhat</p>
      </div>
    </div>
  );
}

function StepVerification({
  area,
  editing,
  verified,
  onEdit,
  onAreaChange,
  onAccept,
  onApprove,
}: {
  area: string;
  editing: boolean;
  verified: boolean;
  onEdit: () => void;
  onAreaChange: (v: string) => void;
  onAccept: () => void;
  onApprove: () => void;
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="rounded-lg border relative overflow-hidden h-[clamp(160px,30vh,260px)] bg-slate-50">
        <Image src={DEMO_LAND_RECORD_AFTER} alt="Source document for verification" fill className="object-contain p-1" sizes="50vw" />
        <p className="absolute top-2 left-2 z-10 text-xs font-semibold uppercase bg-white/90 px-2 py-1 rounded text-[var(--gov-text-muted)]">
          Source document
        </p>
        <div className="absolute z-10 border-2 border-[var(--gov-saffron)] bg-[var(--gov-saffron)]/25 bottom-20 left-6 right-6 h-14 flex items-center justify-center text-sm font-medium shadow-md">
          Area field region
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-amber-700 mb-4">VERIFICATION REQUIRED</p>
        <div className="space-y-4">
          <div className="rounded-lg border p-4 border-amber-300 bg-amber-50/40">
            <p className="text-xs font-semibold text-[var(--gov-text-muted)]">Area</p>
            <p className="text-sm">AI: 1.80 ha · Confidence: 68%</p>
            {editing ? (
              <input
                value={area}
                onChange={(e) => onAreaChange(e.target.value)}
                className="mt-2 w-full rounded border px-3 py-2 text-lg font-semibold"
              />
            ) : (
              <p className="text-2xl font-bold mt-1">{area} ha</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onAccept}>Accept 1.80</Button>
            <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
          </div>
          <Button onClick={onApprove} disabled={verified}>
            Approve record
          </Button>
          {verified && (
            <p className="text-[var(--gov-green)] font-semibold flex items-center gap-2">
              <Check className="h-5 w-5" /> Human verification completed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StepStorage({ ticks }: { ticks: number }) {
  const items = [
    "Land record",
    "Owner information",
    "OCR results",
    "Validation results",
    "Verification history",
    "Document metadata",
    "Audit trail",
  ];
  return (
    <div className="max-w-md mx-auto space-y-6">
      <h2 className="text-xl font-bold text-[var(--gov-navy)]">Database storage</h2>
      <p className="text-sm text-[var(--gov-navy-light)] flex items-center gap-2">
        {ticks < 7 ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Saving verified record…
      </p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={item} className={cn("flex items-center gap-2 text-sm", i < ticks ? "text-[var(--gov-green)]" : "text-[var(--gov-text-light)]")}>
            {i < ticks ? <Check className="h-4 w-4" /> : <span className="w-4" />}
            {item}
          </li>
        ))}
      </ul>
      {ticks >= 7 && (
        <div className="rounded-lg border p-4 text-sm">
          <p>Record ID: <RecordIdLink recordId={DEMO_RECORD_ID} /></p>
          <p className="mt-2 font-semibold text-[var(--gov-green)]">Status: VERIFIED ✓</p>
        </div>
      )}
    </div>
  );
}

function StepGis({ zoom, area }: { zoom: boolean; area: string }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-center gap-2 text-xs font-semibold text-[var(--gov-navy)]">
        <span>Verified land record</span>
        <span>↓</span>
        <span>Khasra 235/1</span>
        <span>↓</span>
        <span>GIS match</span>
        <span>↓</span>
        <span className="text-[var(--gov-green)]">Land parcel found</span>
      </div>
      <div
        className={cn(
          "rounded-xl border-2 border-[var(--gov-green)] bg-gradient-to-br from-green-50 to-slate-100 h-64 flex items-center justify-center transition-transform duration-1000",
          zoom && "scale-105"
        )}
      >
        <MapPin className={cn("h-16 w-16 text-[var(--gov-green)]", zoom && "animate-bounce")} />
        <span className="ml-4 font-mono font-bold">235/1</span>
      </div>
      {zoom && (
        <div className="max-w-sm mx-auto gov-card p-5 border-l-4 border-l-[var(--gov-green)]">
          <p className="font-bold text-[var(--gov-navy)]">Land parcel</p>
          <dl className="text-sm mt-3 space-y-1">
            <div>Khasra: 235/1</div>
            <div>Owner: Ram Singh</div>
            <div>Area: {area} ha</div>
            <div>Village: Chinhat</div>
            <div className="text-[var(--gov-green)] font-semibold">Status: Verified</div>
          </dl>
          <Link href={`/records/${DEMO_RECORD_ID}`} className="inline-block mt-4">
            <Button size="sm">View full record</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function StepCert({ show }: { show: boolean }) {
  return (
    <div className="max-w-lg mx-auto text-center space-y-4">
      <div className="text-xs font-semibold text-[var(--gov-text-muted)] space-y-1">
        <p>Verified record → SHA-256 hash → 4f8a21c…82cd → Blockchain certification</p>
      </div>
      {show && (
        <div className="gov-card p-8 border-2 border-[var(--gov-green)]">
          <p className="text-lg font-bold text-[var(--gov-green)]">Record certified ✓</p>
          <p className="text-sm mt-4">Record ID: {DEMO_RECORD_ID}</p>
          <p className="font-mono text-xs mt-2">Hash: 4f8a21c…82cd</p>
          <p className="text-sm mt-2">Timestamp: 30 Sep 2026</p>
          <p className="font-mono text-xs">Blockchain TX: 0x7A82…91FD</p>
          <div className="h-24 w-24 mx-auto mt-6 border-2 border-dashed rounded-lg flex items-center justify-center text-xs text-[var(--gov-text-muted)]">
            QR
          </div>
          <p className="text-[10px] text-[var(--gov-text-muted)] mt-4">
            Certification record — document images are not stored on-chain.
          </p>
          <Link href="/trust/verify" className="inline-block mt-4">
            <Button variant="outline" size="sm">Open verification</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function StepFinal({ area }: { area: string }) {
  const rows = [
    ["Document", "Processed"],
    ["AI extraction", "Complete"],
    ["Validation", "Complete"],
    ["Human verification", "Approved"],
    ["GIS linking", "Matched"],
    ["Certification", "Certified"],
  ];
  return (
    <div className="max-w-lg mx-auto">
      <div className="border-2 border-[var(--gov-navy)] rounded-lg overflow-hidden">
        <div className="bg-[var(--gov-navy)] text-white text-center py-3 font-bold tracking-wide">
          Land record verified
        </div>
        <div className="p-6 space-y-3 text-sm">
          {rows.map(([label, status]) => (
            <div key={label} className="flex justify-between">
              <span>{label}</span>
              <span className="text-[var(--gov-green)] font-semibold">✓ {status}</span>
            </div>
          ))}
          <p className="text-center text-lg font-bold text-[var(--gov-navy)] pt-4 border-t">
            Overall confidence: 96.2%
          </p>
          <p className="text-center text-xs text-[var(--gov-text-muted)]">Final area on record: {area} ha</p>
          <div className="grid gap-2 mt-4">
            <Link href={`/records/${DEMO_RECORD_ID}`}>
              <Button className="w-full">View digital record (360°)</Button>
            </Link>
            <Link href="/demo/portal">
              <Button variant="outline" className="w-full">GIS & ledger demo</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full">Sign in to live portal</Button>
            </Link>
            <Link href="/documents/upload">
              <Button variant="outline" className="w-full">Upload your own scan</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
