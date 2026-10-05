"use client";

import { useState } from "react";
import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { useLocale } from "@/contexts/LocaleContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/States";
import { useApi } from "@/lib/use-api";
import { apiDelete, apiPost } from "@/lib/api-client";
import { useToast } from "@/contexts/ToastContext";
import { formatDate } from "@/lib/utils";
import type { ApiKeyInfo, WebhookInfo } from "@/types";
import { Copy, ExternalLink } from "lucide-react";

interface Health {
  database: { driver: string; status: string };
  storage: { driver: string };
  worker: { mode: string; running: boolean; jobs: Record<string, number> };
  ocr: { engine: string; tesseract: string; gemini: string };
  mlService: { url: string; status: string } | null;
  certification: { keyId: string; keySource: string };
  notifications: { email: string; sms: string };
  geocoder: string;
}

function Secret({ title, value, onClose }: { title: string; value: string | null; onClose: () => void }) {
  const { toast } = useToast();
  const { t } = useLocale();
  return (
    <Modal open={Boolean(value)} title={title} onClose={onClose} footer={<Button onClick={onClose}>{t("Done")}</Button>}>
      <p className="text-sm text-amber-800 mb-2">{t("Copy it now — it will not be shown again.")}</p>
      <div className="flex gap-2">
        <code className="flex-1 break-all rounded bg-[var(--gov-bg-subtle)] p-2 text-xs">{value}</code>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("Copy")}
          onClick={() => {
            navigator.clipboard.writeText(value ?? "").then(() => toast("Copied", "success"));
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </Modal>
  );
}

export default function IntegrationsPage() {
  const { toast } = useToast();
  const { t, tx } = useLocale();
  const health = useApi<Health>("/api/integrations/health", { pollMs: 15000 });
  const keys = useApi<{ items: ApiKeyInfo[]; scopes: string[] }>("/api/integrations/keys");
  const hooks = useApi<{ items: WebhookInfo[]; events: string[] }>("/api/integrations/subscriptions");
  const [keyForm, setKeyForm] = useState<{ name: string; scopes: string[] }>({ name: "", scopes: ["records:read", "parcels:read", "certificates:read"] });
  const [hookForm, setHookForm] = useState<{ url: string; events: string[] }>({ url: "", events: ["record.verified"] });
  const [secret, setSecret] = useState<{ title: string; value: string } | null>(null);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const createKey = async () => {
    try {
      const res = await apiPost<{ key: string }>("/api/integrations/keys", keyForm);
      setSecret({ title: "New API key", value: res.key });
      setKeyForm({ ...keyForm, name: "" });
      keys.reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not create key", "error");
    }
  };
  const createHook = async () => {
    try {
      const res = await apiPost<{ secret: string }>("/api/integrations/subscriptions", hookForm);
      setSecret({ title: "Webhook signing secret", value: res.secret });
      setHookForm({ ...hookForm, url: "" });
      hooks.reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not register webhook", "error");
    }
  };
  const toggleHook = async (h: WebhookInfo) => {
    const res = await fetch(`/api/integrations/subscriptions/${h.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !h.active }),
    });
    if (res.ok) hooks.reload();
  };

  const h = health.data;
  return (
    <AppLayout title="Integrations">
      <div className="space-y-6 max-w-5xl">
        <PageTitle
          title="Integrations"
          description="System health, API access for LRMS / DILRMP / GIS systems, and outbound webhooks."
          actions={
            <a href="/api/v1/openapi.json" target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> {t("OpenAPI spec")}</Button>
            </a>
          }
        />

        <Card title="System health">
          {!h ? (
            <LoadingState />
          ) : (
            <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div><dt className="text-[var(--gov-text-muted)]">{t("Database")}</dt><dd className="font-medium">{h.database.driver === "pglite" ? t("Embedded PostgreSQL (PGlite)") : "PostgreSQL"} · {tx(h.database.status)}</dd></div>
              <div><dt className="text-[var(--gov-text-muted)]">{t("File storage")}</dt><dd className="font-medium">{h.storage.driver === "s3" ? t("S3-compatible bucket") : t("Local disk")}</dd></div>
              <div>
                <dt className="text-[var(--gov-text-muted)]">{t("Job worker")}</dt>
                <dd className="font-medium">
                  {tx(h.worker.mode)} {h.worker.running ? <Badge variant="success">{t("running")}</Badge> : <Badge variant="neutral">{t("not in this process")}</Badge>}
                </dd>
                <dd className="text-xs text-[var(--gov-text-muted)]">
                  {Object.entries(h.worker.jobs).map(([k, v]) => `${v} ${t(k)}`).join(" · ") || t("no jobs yet")}
                </dd>
              </div>
              <div><dt className="text-[var(--gov-text-muted)]">OCR</dt><dd className="font-medium">{tx(h.ocr.tesseract)}</dd><dd className="text-xs">Gemini: {tx(h.ocr.gemini)}</dd></div>
              <div><dt className="text-[var(--gov-text-muted)]">{t("ML enhancement service")}</dt><dd className="font-medium">{h.mlService ? `${h.mlService.url} · ${tx(h.mlService.status)}` : t("not configured (local enhancement)")}</dd></div>
              <div><dt className="text-[var(--gov-text-muted)]">{t("Certificate signing key")}</dt><dd className="font-medium font-mono text-xs">{h.certification.keyId}</dd><dd className="text-xs">{h.certification.keySource === "env" ? t("from CERT_SIGNING_KEY") : tx(h.certification.keySource)}</dd></div>
              <div><dt className="text-[var(--gov-text-muted)]">{t("Email / SMS")}</dt><dd className="font-medium">{tx(h.notifications.email)} · {tx(h.notifications.sms)}</dd></div>
              <div><dt className="text-[var(--gov-text-muted)]">{t("Geocoder")}</dt><dd className="font-medium">{tx(h.geocoder)}</dd></div>
            </dl>
          )}
        </Card>

        <Card title="API keys">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <Field label="System name" className="min-w-[220px] flex-1 sm:flex-none">
              <Input value={keyForm.name} onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })} placeholder={t("e.g. UP Bhulekh sync")} />
            </Field>
            <div className="text-sm">
              <p className="font-medium text-[var(--gov-navy)] mb-1">{t("Scopes")}</p>
              <div className="flex flex-wrap gap-3">
                {keys.data?.scopes.map((s) => (
                  <label key={s} className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={keyForm.scopes.includes(s)} onChange={() => setKeyForm({ ...keyForm, scopes: toggle(keyForm.scopes, s) })} /> {s}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={createKey} disabled={!keyForm.name.trim() || !keyForm.scopes.length}>{t("Create key")}</Button>
          </div>
          {keys.data && keys.data.items.length === 0 && <p className="text-sm text-[var(--gov-text-muted)]">{t("No API keys yet.")}</p>}
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-[var(--gov-text-muted)]"><th className="py-1 pr-3">{t("Name")}</th><th className="pr-3">{t("Prefix")}</th><th className="pr-3">{t("Scopes")}</th><th className="pr-3">{t("Last used")}</th><th /></tr></thead>
            <tbody>
              {keys.data?.items.map((k) => (
                <tr key={k.id} className="border-t border-[var(--gov-border-light)]">
                  <td className="py-2">{k.name}</td>
                  <td className="font-mono text-xs">{k.prefix}</td>
                  <td className="text-xs">{k.scopes.join(", ")}</td>
                  <td className="text-xs">{k.lastUsedAt ? formatDate(k.lastUsedAt) : t("never")}</td>
                  <td className="text-right">
                    {k.revokedAt ? (
                      <Badge variant="neutral">{t("revoked")}</Badge>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={async () => { await apiDelete(`/api/integrations/keys/${k.id}`); keys.reload(); }}>{t("Revoke")}</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <pre className="mt-4 text-xs bg-[var(--gov-bg-subtle)] rounded p-3 overflow-x-auto">{`curl -H "Authorization: Bearer dh_xxxxxxxx_…" \\
  "https://<dharohar-host>/api/v1/records?district=Lucknow&updated_since=2026-01-01"`}</pre>
        </Card>

        <Card title="Webhooks">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <Field label="Endpoint URL" className="min-w-[240px] flex-1">
              <Input value={hookForm.url} onChange={(e) => setHookForm({ ...hookForm, url: e.target.value })} placeholder="https://lrms.example.gov.in/hooks/dharohar" />
            </Field>
            <div className="text-sm">
              <p className="font-medium text-[var(--gov-navy)] mb-1">{t("Events")}</p>
              <div className="flex flex-wrap gap-3">
                {hooks.data?.events.map((ev) => (
                  <label key={ev} className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={hookForm.events.includes(ev)} onChange={() => setHookForm({ ...hookForm, events: toggle(hookForm.events, ev) })} /> {ev}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={createHook} disabled={!hookForm.url.trim() || !hookForm.events.length}>{t("Register")}</Button>
          </div>
          {hooks.data && hooks.data.items.length === 0 && <p className="text-sm text-[var(--gov-text-muted)]">{t("No webhooks registered.")}</p>}
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-[var(--gov-text-muted)]"><th className="py-1 pr-3">URL</th><th className="pr-3">{t("Events")}</th><th className="pr-3">{t("Last delivery")}</th><th /></tr></thead>
            <tbody>
              {hooks.data?.items.map((w) => (
                <tr key={w.id} className="border-t border-[var(--gov-border-light)]">
                  <td className="py-2 break-all">{w.url}</td>
                  <td className="text-xs">{w.events.join(", ")}</td>
                  <td className="text-xs">{w.lastDeliveryAt ? `${formatDate(w.lastDeliveryAt)} · ${w.lastStatus}` : "—"}</td>
                  <td className="text-right"><Button size="sm" variant="ghost" onClick={() => toggleHook(w)}>{w.active ? t("Disable") : t("Enable")}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <p className="text-xs text-[var(--gov-text-muted)] mt-3">
            {t("Each delivery carries")} <code>X-Dharohar-Signature: sha256=HMAC(secret, body)</code>; {t("failed deliveries retry with exponential backoff.")}
          </p>
        </Card>
      </div>
      <Secret title={secret?.title ?? ""} value={secret?.value ?? null} onClose={() => setSecret(null)} />
    </AppLayout>
  );
}
