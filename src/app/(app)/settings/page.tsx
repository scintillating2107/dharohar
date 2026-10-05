"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useLocale } from "@/contexts/LocaleContext";
import { apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { NotificationPrefs } from "@/types";

async function patchMe(body: Record<string, unknown>) {
  const res = await fetch("/api/auth/me", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Could not save");
}

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const { locale, setLocale, t } = useLocale();
  const [prefs, setPrefs] = useState<NotificationPrefs>(user?.notificationPrefs ?? { email: true, sms: false, inApp: true });
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const savePrefs = async () => {
    setSaving(true);
    try {
      await patchMe({ notificationPrefs: prefs, phone });
      await refresh();
      toast("Preferences saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save", "error");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (pw.newPassword !== pw.confirm) {
      toast("New passwords do not match", "error");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/auth/password", { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      toast("Password changed", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not change password", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="My settings">
      <div className="max-w-2xl space-y-6">
        <Card title="Notifications">
          <div className="space-y-3 text-sm">
            {(
              [
                ["inApp", "In-app notifications"],
                ["email", t("Email to {email}", { email: user?.email ?? "" })],
                ["sms", "SMS (requires a mobile number)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input type="checkbox" checked={prefs[key]} onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })} />
                {t(label)}
              </label>
            ))}
            <Field label="Mobile number">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxxxxxxx" />
            </Field>
            <p className="text-xs text-[var(--gov-text-muted)]">{t("Email and SMS are delivered when the administrator has configured a mail server / SMS gateway.")}</p>
            <Button onClick={savePrefs} loading={saving}>{t("Save preferences")}</Button>
          </div>
        </Card>

        <Card title="Language">
          <div className="flex gap-2 text-sm">
            {(["en", "hi"] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={locale === l}
                onClick={() => setLocale(l)}
                className={cn(
                  "rounded-full border px-3 py-1",
                  locale === l ? "bg-[var(--gov-navy)] text-white border-[var(--gov-navy)]" : "border-[var(--gov-border)] bg-white"
                )}
              >
                {l === "en" ? "English" : "हिन्दी"}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Change password">
          <div className="grid gap-3 max-w-sm">
            <Field label="Current password"><Input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
            <Field label="New password" hint="At least 8 characters with letters and numbers">
              <Input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            </Field>
            <Field label="Confirm new password"><Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
            <Button onClick={changePassword} loading={saving} disabled={!pw.currentPassword || !pw.newPassword}>{t("Change password")}</Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
