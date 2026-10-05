"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/States";
import { ProcessingStatusBadge } from "@/components/ui/StatusBadges";
import { ProcessingTimeline } from "@/components/processing/ProcessingTimeline";
import type { RecordDetail } from "@/components/records/Record360";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useToast } from "@/contexts/ToastContext";
import { useApi, useSystemSettings } from "@/lib/use-api";
import { hasPermission } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { Document, PaginatedResponse } from "@/types";
import { Maximize2, Minimize2, PlayCircle } from "lucide-react";
import { INTRO, StepFooter, StepHeader, StepNotes, StepPanel, StepRail, TourIntro, parseStep, useStepKeys, useTour } from "./ShowcaseStage";

const DONE = new Set(["VERIFICATION_REQUIRED", "VERIFIED", "REJECTED", "VALIDATED", "FAILED"]);

/**
 * Guided presentation of the digitization workflow on a real document. Every panel renders the
 * system's own stored results (scan pages, OCR words, fields, validation, ledger) — nothing is mocked.
 */
export function ShowcaseView() {
  const { t } = useLocale();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const settings = useSystemSettings();
  const rootRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [starting, setStarting] = useState(false);

  const step = parseStep(params.get("step"));
  const list = useApi<PaginatedResponse<Document>>("/api/documents?pageSize=50");
  const candidates = (list.data?.items ?? []).filter((d) => d.recordId || !DONE.has(d.status));
  const fallback = candidates.find((d) => /demo/i.test(d.name) && d.recordId) ?? candidates.find((d) => d.recordId);
  const docId = params.get("doc") ?? fallback?.id ?? null;

  // Poll while the selected document is still being processed
  const [polling, setPolling] = useState(true);
  const doc = useApi<{ document: Document }>(docId ? `/api/documents/${docId}` : null, { pollMs: polling ? 2000 : undefined });
  const document = doc.data?.document?.id === docId ? doc.data?.document : undefined;
  const processing = !document || !DONE.has(document.status);
  if (polling !== processing && document) setPolling(processing);
  const recordId = document && DONE.has(document.status) ? document.recordId : undefined;
  const detail = useApi<RecordDetail>(recordId ? `/api/records/${recordId}` : null);

  const go = useCallback(
    (next: { step?: number; doc?: string }) => {
      const qs = new URLSearchParams(params.toString());
      if (next.step !== undefined) qs.set("step", String(next.step + 1));
      if (next.doc) qs.set("doc", next.doc);
      router.replace(`/showcase?${qs}`, { scroll: false });
    },
    [params, router]
  );

  const goStep = useCallback((n: number) => go({ step: n }), [go]);
  useStepKeys(step, goStep);
  const tour = useTour(step, goStep);
  const play = () => {
    if (step === INTRO) goStep(0);
    tour.setPlaying(true);
  };

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(window.document.fullscreenElement));
    window.document.addEventListener("fullscreenchange", onChange);
    return () => window.document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = () => {
    if (window.document.fullscreenElement) void window.document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  };

  const runSample = async () => {
    setStarting(true);
    try {
      const blob = await fetch("/samples/demo-khatauni-hi.jpg").then((r) => r.blob());
      const form = new FormData();
      form.append("file", new File([blob], "demo-khatauni-chinhat-hi.jpg", { type: "image/jpeg" }));
      form.append("name", "Khatauni Chinhat 618/2 (demo)");
      form.append("recordType", "Khatauni / Record of Rights");
      form.append("sourceOffice", "Tehsil office");
      form.append("state", "Uttar Pradesh");
      form.append("language", "auto");
      form.append("autoProcess", "true");
      const res = await fetch("/api/documents", { method: "POST", body: form, credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Upload failed");
      setPolling(true);
      list.reload();
      go({ doc: json.data.document.id, step: 0 });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setStarting(false);
    }
  };

  const canUpload = user ? hasPermission(user.role, "upload") : false;
  const ready = detail.data?.document && detail.data.record;

  let body: React.ReactNode;
  if (list.initialLoading || (docId && doc.initialLoading)) body = <LoadingState />;
  else if (!docId) {
    body = (
      <EmptyState
        title="No processed document yet"
        description="Run the demo with the bundled sample khatauni to see every stage on a real document."
        action={canUpload ? <Button onClick={runSample} loading={starting}><PlayCircle className="h-4 w-4" /> {t("Run live with sample document")}</Button> : undefined}
      />
    );
  } else if (!document) body = <ErrorState message={doc.error || "Document not found"} onRetry={doc.reload} />;
  else if (processing || !recordId) {
    body = (
      <Card title="Processing live">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <ProcessingStatusBadge status={document.status} />
          <span className="text-sm text-[var(--gov-text-muted)]">{t("Each stage below runs on the server right now; the walkthrough opens when the record is ready.")}</span>
        </div>
        <ProcessingTimeline steps={document.steps} />
        {document.status === "FAILED" && document.error && <p className="mt-3 text-sm text-red-700">{document.error}</p>}
      </Card>
    );
  } else if (!ready) body = detail.error ? <ErrorState message={detail.error} onRetry={detail.reload} /> : <LoadingState />;
  else {
    const d = detail.data!;
    body =
      step === INTRO ? (
        <TourIntro detail={d} settings={settings} onStep={goStep} onPlay={play} />
      ) : (
        <div className="space-y-5">
          <StepHeader step={step} detail={d} settings={settings} />
          <StepPanel step={step} detail={d} settings={settings} onChanged={detail.reload} />
          <StepNotes step={step} />
        </div>
      );
  }

  return (
    <AppLayout title="Workflow demo">
      <div ref={rootRef} className={cn("space-y-5", fullscreen && "h-screen overflow-y-auto bg-[var(--gov-bg)] p-6")}>
        <PageTitle
          title="Workflow demo"
          description="A guided tour of the digitization pipeline on a real document — every screen shows live data from the system."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {candidates.length > 0 && (
                <Select className="max-w-[260px]" aria-label={t("Document")} value={docId ?? ""} onChange={(e) => go({ doc: e.target.value })}>
                  {candidates.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                      {d.recordId ? ` · ${d.recordId}` : ""}
                    </option>
                  ))}
                </Select>
              )}
              {canUpload && (
                <Button variant="outline" size="sm" onClick={runSample} loading={starting}>
                  <PlayCircle className="h-4 w-4" /> {t("Run live with sample")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={toggleFullscreen} aria-pressed={fullscreen}>
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />} {t(fullscreen ? "Exit presenter mode" : "Presenter mode")}
              </Button>
            </div>
          }
        />

        <StepRail step={step} onStep={goStep} playing={tour.playing} onTogglePlay={() => (tour.playing ? tour.setPlaying(false) : play())} seconds={tour.seconds} />

        <section aria-live="polite" className="min-w-0">
          {body}
        </section>

        <StepFooter step={step} onStep={goStep} />
      </div>
    </AppLayout>
  );
}
