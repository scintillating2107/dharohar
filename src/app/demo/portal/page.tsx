"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PublicShell } from "@/components/demo/PublicShell";
import { DemoParcelMiniPreview } from "@/components/demo/DemoParcelMap";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  DEMO_PORTAL_PROPERTY,
  DEMO_PORTAL_STEPS,
  type DemoParcelSelection,
} from "@/lib/demo-portal-data";
import { DEMO_RECORD_ID } from "@/lib/record-ids";

const DemoParcelMap = dynamic(
  () => import("@/components/demo/DemoParcelMap").then((m) => m.DemoParcelMap),
  { ssr: false }
);
const DemoParcelSidePanel = dynamic(
  () => import("@/components/demo/DemoParcelMap").then((m) => m.DemoParcelSidePanel),
  { ssr: false }
);

type TxInfo = { hash: string; block: number; ts: string; nodeId: string };

export default function DemoPortalPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [landSubmitted, setLandSubmitted] = useState(false);
  const [govApproved, setGovApproved] = useState(false);
  const [txInfo, setTxInfo] = useState<TxInfo | null>(null);
  const [recordVerified, setRecordVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<DemoParcelSelection | null>(null);

  function pushLog(message: string) {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${message}`]);
  }

  function goToStep(stepId: number) {
    setCurrentStep(stepId);
  }

  function markStepComplete(stepId: number) {
    setCompletedSteps((prev) => (prev.includes(stepId) ? prev : [...prev, stepId]));
    if (stepId < 5) setCurrentStep(stepId + 1);
  }

  async function handleVerifyIdentity() {
    setLoading(true);
    pushLog("Aadhaar-linked identity check started");
    await new Promise((r) => setTimeout(r, 600));
    setIdentityVerified(true);
    pushLog("Identity verified for citizen");
    setLoading(false);
    markStepComplete(1);
  }

  function handleSubmitLand() {
    setLandSubmitted(true);
    pushLog("Land parcel linked to GIS boundary (Chinhat)");
    markStepComplete(2);
  }

  async function handleApprove() {
    setLoading(true);
    pushLog("Verification officer review");
    await new Promise((r) => setTimeout(r, 500));
    setGovApproved(true);
    pushLog("Record approved — ready for certification");
    setLoading(false);
    markStepComplete(3);
  }

  async function handleCreateTx() {
    setLoading(true);
    pushLog("Anchoring certification hash to ledger (demo)");
    setCurrentStep(4);
    await new Promise((r) => setTimeout(r, 700));
    const info: TxInfo = {
      hash: "0x4f8a21c9e2b7cfe238a82cd",
      block: 10425,
      ts: new Date().toLocaleString(),
      nodeId: "Node-Lucknow-01",
    };
    setTxInfo(info);
    pushLog(`Certification anchor created · ${info.hash.slice(0, 14)}…`);
    setLoading(false);
    markStepComplete(4);
  }

  function handleVerifyRecord() {
    setRecordVerified(true);
    pushLog("Public verification matched ledger hash");
    markStepComplete(5);
  }

  const allDone = completedSteps.length === 5 && txInfo && recordVerified;

  return (
    <PublicShell
      title="Interactive registration — GIS & certification"
      subtitle="Click each step: identity → parcel/GIS → approval → ledger anchor → map verification. Aligned with Dharohar trust & GIS modules."
      hideQuickLinks
    >
      <div className="grid lg:grid-cols-[240px,minmax(0,1.4fr),minmax(0,0.85fr)] gap-4">
        <aside className="gov-card p-4 h-fit">
          <h2 className="text-sm font-semibold text-[var(--gov-navy)] mb-3">Workflow</h2>
          <ol className="space-y-2 text-sm">
            {DEMO_PORTAL_STEPS.map((step) => {
              const isDone = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => goToStep(step.id)}
                    className={`w-full flex items-start gap-2 rounded-lg px-2 py-2 text-left ${
                      isCurrent ? "bg-[var(--gov-bg-subtle)] border border-[var(--gov-border)]" : "hover:bg-[var(--gov-bg)]"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isDone
                          ? "bg-green-100 text-green-800 border border-green-300"
                          : isCurrent
                            ? "bg-[var(--gov-navy)] text-white"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isDone ? "✓" : step.id}
                    </span>
                    <span className="font-medium text-[var(--gov-navy)]">{step.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <Link href="/demo/workflow" className="block mt-4 text-xs text-[var(--gov-navy-light)] font-semibold hover:underline">
            ← Digitization walkthrough (OCR pipeline)
          </Link>
        </aside>

        <section className="space-y-4 min-w-0">
          {currentStep === 1 && (
            <div className="gov-card p-4 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--gov-navy)]">Step 1 — Citizen identity</h2>
              <p className="text-xs text-[var(--gov-text-muted)]">Simulated Aadhaar-linked verification (demo).</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--gov-text-muted)] mb-1">Owner name</label>
                  <Input readOnly defaultValue={DEMO_PORTAL_PROPERTY.ownerName} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--gov-text-muted)] mb-1">Aadhaar</label>
                  <Input readOnly defaultValue="XXXX-XXXX-9012" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--gov-text-muted)] mb-1">Mobile</label>
                  <Input readOnly defaultValue="+91-98765 43210" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--gov-text-muted)] mb-1">District</label>
                  <Input readOnly defaultValue={DEMO_PORTAL_PROPERTY.district} />
                </div>
              </div>
              <Button onClick={handleVerifyIdentity} disabled={loading || identityVerified} loading={loading}>
                {identityVerified ? "Identity verified" : "Verify identity"}
              </Button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="gov-card p-4 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--gov-navy)]">Step 2 — Land registration & GIS</h2>
              <p className="text-xs text-[var(--gov-text-muted)]">Parcel attributes and boundary preview (Chinhat).</p>
              <div className="grid sm:grid-cols-3 gap-3">
                <Input readOnly defaultValue={DEMO_PORTAL_PROPERTY.state} aria-label="State" />
                <Input readOnly defaultValue={DEMO_PORTAL_PROPERTY.district} aria-label="District" />
                <Input readOnly defaultValue={DEMO_PORTAL_PROPERTY.village} aria-label="Village" />
                <Input readOnly defaultValue={DEMO_PORTAL_PROPERTY.surveyNumber} aria-label="Khasra" />
                <Input readOnly defaultValue="124" aria-label="Khata" />
                <Input readOnly defaultValue="1.80 ha" aria-label="Area" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-[var(--gov-text-muted)] mb-2">GIS boundary preview</p>
                  <DemoParcelMiniPreview />
                </div>
                <div className="text-xs space-y-1 text-[var(--gov-navy)] bg-[var(--gov-bg-subtle)] rounded-lg p-3 border border-[var(--gov-border-light)]">
                  <p className="font-semibold">Summary</p>
                  <p>Owner: {DEMO_PORTAL_PROPERTY.ownerName}</p>
                  <p>Khasra: {DEMO_PORTAL_PROPERTY.surveyNumber}</p>
                  <p>Record: {DEMO_RECORD_ID}</p>
                  <p>{DEMO_PORTAL_PROPERTY.landArea}</p>
                </div>
              </div>
              <Button onClick={handleSubmitLand} disabled={landSubmitted}>
                {landSubmitted ? "Registration submitted" : "Submit & link GIS"}
              </Button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="gov-card p-4 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--gov-navy)]">Step 3 — Government approval</h2>
              <div className="rounded-lg border border-[var(--gov-border)] p-4 text-sm space-y-1">
                <p className="font-semibold">Application</p>
                <p>Owner: {DEMO_PORTAL_PROPERTY.ownerName}</p>
                <p>Khasra: {DEMO_PORTAL_PROPERTY.surveyNumber}</p>
                <p>Area: {DEMO_PORTAL_PROPERTY.landArea}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleApprove} disabled={loading || govApproved} loading={loading}>
                  {govApproved ? "Approved" : "Approve registration"}
                </Button>
                <Link href="/verification">
                  <Button variant="outline">Open live verification</Button>
                </Link>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="gov-card p-4 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--gov-navy)]">Step 4 — Ledger certification</h2>
              <p className="text-xs text-[var(--gov-text-muted)]">
                Demo trust layer — hash anchor only; document images stay off-chain (see Certification module).
              </p>
              <div className="grid md:grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg border border-[var(--gov-border)] p-4 bg-[var(--gov-bg-subtle)] space-y-1">
                  <p><span className="text-[var(--gov-text-muted)]">Hash:</span> <span className="font-mono">{txInfo?.hash || "—"}</span></p>
                  <p><span className="text-[var(--gov-text-muted)]">Block:</span> {txInfo?.block ?? "—"}</p>
                  <p><span className="text-[var(--gov-text-muted)]">Node:</span> {txInfo?.nodeId ?? "Node-Lucknow-01"}</p>
                  <p><span className="text-[var(--gov-text-muted)]">Time:</span> {txInfo?.ts ?? "—"}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={handleCreateTx} disabled={loading} loading={loading}>
                    {txInfo ? "Re-anchor (demo)" : "Create certification anchor"}
                  </Button>
                  <Link href="/trust">
                    <Button variant="outline" className="w-full">Open certification page</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="gov-card p-4 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--gov-navy)]">Step 5 — Public verification & GIS</h2>
              <p className="text-xs text-[var(--gov-text-muted)]">Select the verified parcel on the map, then verify against the ledger hash.</p>
              <DemoParcelMap
                height="200px"
                onSelectParcel={(p) => {
                  setSelectedParcel(p);
                  setRecordVerified(false);
                }}
              />
              <div className="grid md:grid-cols-2 gap-3">
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-[var(--gov-navy)]">Record dashboard</p>
                  <p>Owner: {selectedParcel?.ownerName ?? DEMO_PORTAL_PROPERTY.ownerName}</p>
                  <p>Khasra: {selectedParcel?.surveyNumber ?? DEMO_PORTAL_PROPERTY.surveyNumber}</p>
                  <p>Hash: <span className="font-mono text-xs">{selectedParcel?.hash ?? txInfo?.hash ?? "—"}</span></p>
                </div>
                <div className="space-y-2">
                  <DemoParcelSidePanel parcel={selectedParcel} txInfo={txInfo} />
                  <Button
                    onClick={handleVerifyRecord}
                    disabled={recordVerified || !selectedParcel}
                    className="w-full"
                  >
                    {recordVerified ? "Verified on ledger" : "Verify on ledger"}
                  </Button>
                </div>
              </div>
              <Link href="/gis">
                <Button variant="outline" size="sm">Open full GIS module (sign-in)</Button>
              </Link>
            </div>
          )}

          {allDone && (
            <div className="gov-card p-4 border-2 border-[var(--gov-green)] space-y-3">
              <h2 className="font-semibold text-[var(--gov-navy)]">Digital land certificate (demo)</h2>
              <div className="text-sm space-y-1">
                <p className="text-xs uppercase text-[var(--gov-text-muted)]">Government of India · Dharohar demo</p>
                <p className="text-lg font-bold">{DEMO_PORTAL_PROPERTY.ownerName}</p>
                <p>Khasra {DEMO_PORTAL_PROPERTY.surveyNumber} · {DEMO_PORTAL_PROPERTY.village}</p>
                <p>Record {DEMO_RECORD_ID}</p>
                <p className="font-mono text-xs">{txInfo?.hash}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => window.print()}>Print certificate</Button>
                <Link href={`/records/${DEMO_RECORD_ID}`}>
                  <Button>View 360° record</Button>
                </Link>
              </div>
            </div>
          )}
        </section>

        <aside className="rounded-xl border border-slate-800 bg-slate-950 text-emerald-100 text-xs font-mono flex flex-col max-h-[480px]">
          <div className="px-3 py-2 border-b border-slate-800 font-semibold text-slate-200">Audit log (demo)</div>
          <div className="flex-1 overflow-auto px-3 py-2 space-y-0.5">
            {logs.length === 0 ? <p className="text-slate-500">[waiting for actions]</p> : logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </aside>
      </div>
    </PublicShell>
  );
}
