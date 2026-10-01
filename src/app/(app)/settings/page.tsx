"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useLocale } from "@/contexts/LocaleContext";
import { formatRole } from "@/lib/utils";
import { loadAiSettings, saveAiSettings } from "@/lib/ai-settings";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { locale, setLocale } = useLocale();
  const [autoApprove, setAutoApprove] = useState(95);
  const [humanReview, setHumanReview] = useState(70);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [inAppNotif, setInAppNotif] = useState(true);

  useEffect(() => {
    const s = loadAiSettings();
    setAutoApprove(s.autoApprovePercent);
    setHumanReview(s.humanReviewLowPercent);
  }, []);

  const persist = () => {
    saveAiSettings({
      autoApprovePercent: autoApprove,
      humanReviewLowPercent: humanReview,
    });
    toast("Settings saved", "success");
  };

  return (
    <AppLayout title="Settings">
      <div className="max-w-2xl space-y-6">
        <Card title="AI thresholds">
          <p className="text-xs text-[var(--gov-text-muted)] mb-4">
            Confidence bands for badges and review queues — stored in this browser.
          </p>
          <div className="space-y-4 text-sm">
            <label className="block">
              <span className="font-medium text-[var(--gov-navy)]">Auto approve (≥ %)</span>
              <input
                type="number"
                value={autoApprove}
                onChange={(e) => setAutoApprove(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-[var(--gov-border)] px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="font-medium text-[var(--gov-navy)]">Human review band (low %)</span>
              <input
                type="number"
                value={humanReview}
                onChange={(e) => setHumanReview(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-[var(--gov-border)] px-3 py-2"
              />
              <p className="text-xs text-[var(--gov-text-muted)] mt-1">
                Review: {humanReview}–{autoApprove - 1}% · Critical: &lt;{humanReview}%
              </p>
            </label>
          </div>
        </Card>

        <Card title="Language">
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`rounded-full border px-3 py-1 ${locale === "en" ? "bg-[var(--gov-navy)] text-white border-[var(--gov-navy)]" : "border-[var(--gov-border)] bg-white"}`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLocale("hi")}
              className={`rounded-full border px-3 py-1 ${locale === "hi" ? "bg-[var(--gov-navy)] text-white border-[var(--gov-navy)]" : "border-[var(--gov-border)] bg-white"}`}
            >
              हिन्दी
            </button>
          </div>
        </Card>

        <Card title="Notifications">
          <div className="space-y-3 text-sm">
            {[
              { label: "Email", checked: emailNotif, set: setEmailNotif },
              { label: "SMS", checked: smsNotif, set: setSmsNotif },
              { label: "In-app", checked: inAppNotif, set: setInAppNotif },
            ].map(({ label, checked, set }) => (
              <label key={label} className="flex items-center gap-2">
                <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
        </Card>

        <Card title="Profile">
          <dl className="text-sm space-y-2">
            <div><dt className="text-[var(--gov-text-muted)]">Name</dt><dd className="font-medium">{user?.name}</dd></div>
            <div><dt className="text-[var(--gov-text-muted)]">Role</dt><dd>{user ? formatRole(user.role) : "—"}</dd></div>
          </dl>
        </Card>

        <Button onClick={persist}>Save preferences</Button>
      </div>
    </AppLayout>
  );
}
