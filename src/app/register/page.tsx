"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getHomePathForRole } from "@/lib/dashboard-routes";
import { LoadingState } from "@/components/ui/States";
import { GovHeader, GovTricolor, GovFooter } from "@/components/layout/GovBranding";
import { APP_NAME } from "@/lib/config";
import { PS_DEPARTMENT } from "@/lib/problem-statement";
import { apiPost } from "@/lib/api-client";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", district: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, refresh } = useAuth();
  const { toast } = useToast();
  const { t } = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) router.replace(getHomePathForRole(user.role));
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--gov-bg)]">
        <LoadingState message="Loading…" />
      </div>
    );
  }
  if (user) return null;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast("Passwords do not match", "error");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/api/auth/register", form);
      await refresh();
      toast("Account created — welcome to the citizen portal", "success");
      router.push("/citizen/dashboard");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not create account", "error");
    } finally {
      setLoading(false);
    }
  };

  const label = "block text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)] mb-1.5";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--gov-bg)]">
      <GovHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:p-6">
        <div className="w-full max-w-md gov-card overflow-hidden shadow-lg">
          <GovTricolor />
          <div className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-[var(--gov-navy)]">{t("Citizen registration")}</h1>
              <p className="text-sm text-[var(--gov-text-muted)]">{t(APP_NAME)} · {t(PS_DEPARTMENT)}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className={label}>{t("Full name (as on land records)")}</label>
                <Input id="name" value={form.name} onChange={set("name")} required autoComplete="name" />
              </div>
              <div>
                <label htmlFor="email" className={label}>{t("Email")}</label>
                <Input id="email" type="email" value={form.email} onChange={set("email")} required autoComplete="email" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="district" className={label}>{t("District")}</label>
                  <Input id="district" value={form.district} onChange={set("district")} placeholder={t("e.g. Lucknow")} />
                </div>
                <div>
                  <label htmlFor="phone" className={label}>{t("Mobile (optional)")}</label>
                  <Input id="phone" value={form.phone} onChange={set("phone")} autoComplete="tel" />
                </div>
              </div>
              <div>
                <label htmlFor="password" className={label}>{t("Password")}</label>
                <Input id="password" type="password" value={form.password} onChange={set("password")} required minLength={8} autoComplete="new-password" />
                <p className="text-xs text-[var(--gov-text-muted)] mt-1">{t("At least 8 characters, with letters and numbers.")}</p>
              </div>
              <div>
                <label htmlFor="confirm" className={label}>{t("Confirm password")}</label>
                <Input id="confirm" type="password" value={form.confirm} onChange={set("confirm")} required autoComplete="new-password" />
              </div>
              <Button type="submit" loading={loading} className="w-full" size="lg">{t("Create citizen account")}</Button>
            </form>
            <p className="mt-6 text-center text-sm text-[var(--gov-text-muted)]">
              {t("Already registered?")}{" "}
              <Link href="/login" className="font-semibold text-[var(--gov-navy)] hover:underline">{t("Sign in")}</Link>
            </p>
            <p className="mt-3 text-center text-xs text-[var(--gov-text-light)]">
              {t("After registering, claim your land record by its ID; a revenue officer confirms the claim.")}
            </p>
          </div>
        </div>
      </main>
      <GovFooter />
    </div>
  );
}
