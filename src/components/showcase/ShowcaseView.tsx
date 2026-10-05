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
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, PlayCircle, Sparkles } from "lucide-react";
import { SHOWCASE_STEPS } from "./content";
import { EnhancementPanel, OcrPanel, SchemaPanel, ValidationPanel } from "./PanelsPipeline";
import { ConfidencePanel, GisPanel, LedgerPanel, VerificationPanel } from "./PanelsTrust";

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

  const step = Math.min(SHOWCASE_STEPS.length - 1, Math.max(0, Number(params.get("step") ?? 1) - 1));
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

  // ← / → move between steps (ignored while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input,textarea,select,[contenteditable=true]")) return;
      if (e.key === "ArrowRight" && step < SHOWCASE_STEPS.length - 1) go({ step: step + 1 });
      if (e.key === "ArrowLeft" && step > 0) go({ step: step - 1 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, step]);

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
      form.append("name", "Khatauni Chinhat 512/3 (demo)");
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

  const current = SHOWCASE_STEPS[step];
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
    body = {
      enhance: <EnhancementPanel document={d.document!} />,
      ocr: <OcrPanel detail={d} />,
      schema: <SchemaPanel detail={d} />,
      validate: <ValidationPanel detail={d} />,
      confidence: <ConfidencePanel detail={d} settings={settings} />,
      verify: <VerificationPanel detail={d} />,
      gis: <GisPanel detail={d} settings={settings} onChanged={detail.reload} />,
      ledger: <LedgerPanel detail={d} />,
    }[current.key];
  }

  const Icon = current.icon;
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

        <nav aria-label={t("Workflow steps")} className="overflow-x-auto">
          <ol className="flex min-w-max items-center gap-1">
            {SHOWCASE_STEPS.map((s, i) => {
              const StepIcon = s.icon;
              const state = i === step ? "current" : i < step ? "done" : "todo";
              return (
                <li key={s.key} className="flex items-center gap-1">
                  {i > 0 && <span className={cn("h-0.5 w-4 sm:w-6", i <= step ? "bg-[var(--gov-saffron)]" : "bg-[var(--gov-border)]")} />}
                  <button
                    type="button"
                    onClick={() => go({ step: i })}
                    aria-current={state === "current" ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      state === "current" && "border-[var(--gov-navy)] bg-[var(--gov-navy)] text-white shadow",
                      state === "done" && "border-[var(--gov-saffron)] bg-orange-50 text-[var(--gov-navy)]",
                      state === "todo" && "border-[var(--gov-border)] bg-white text-[var(--gov-text-muted)] hover:border-[var(--gov-navy)]"
                    )}
                  >
                    <StepIcon className="h-3.5 w-3.5" />
                    <span>
                      {i + 1}. {t(s.short)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="grid min-[1700px]:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
          <aside className="gov-card p-5 min-[1700px]:sticky min-[1700px]:top-[76px]">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--gov-navy)] text-white">
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--gov-saffron)]">
                  {t("Step {n} of {total}", { n: step + 1, total: SHOWCASE_STEPS.length })}
                </p>
                <h2 className="text-lg font-bold leading-tight text-[var(--gov-navy)]">{t(current.title)}</h2>
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--gov-text)]">{t(current.tagline)}</p>
            <ul className="mt-4 grid gap-x-6 gap-y-2.5 md:grid-cols-2 min-[1700px]:grid-cols-1">
              {current.points.map((p) => (
                <li key={p} className="flex gap-2 text-sm text-[var(--gov-text-muted)]">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gov-saffron)]" />
                  <span>{t(p)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-[var(--gov-text-muted)]">{t("Technology")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {current.tech.map((x) => (
                <span key={x} className="rounded-md border border-[var(--gov-border-light)] bg-[var(--gov-bg-subtle)] px-2 py-0.5 text-xs text-[var(--gov-navy)]">
                  {t(x)}
                </span>
              ))}
            </div>
            {document && (
              <div className="mt-5 border-t border-[var(--gov-border-light)] pt-3 text-xs text-[var(--gov-text-muted)]">
                <p className="font-semibold text-[var(--gov-navy)] break-words">{document.name}</p>
                <p className="font-mono">
                  {document.id}
                  {document.recordId ? ` · ${document.recordId}` : ""}
                </p>
              </div>
            )}
          </aside>

          <section aria-live="polite" className="min-w-0">
            {body}
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--gov-border-light)] pt-4">
          <Button variant="outline" onClick={() => go({ step: step - 1 })} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4" /> {step > 0 ? t(SHOWCASE_STEPS[step - 1].short) : t("Previous")}
          </Button>
          <p className="hidden sm:block text-xs text-[var(--gov-text-muted)]">{t("Use ← → keys to move between steps")}</p>
          <Button onClick={() => go({ step: step + 1 })} disabled={step === SHOWCASE_STEPS.length - 1}>
            {step < SHOWCASE_STEPS.length - 1 ? t(SHOWCASE_STEPS[step + 1].short) : t("Next")} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
