"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DEMO_LOGINS, APP_NAME } from "@/lib/config";
import { getHomePathForRole } from "@/lib/dashboard-routes";
import { LoadingState } from "@/components/ui/States";
import { GovHeader, GovEmblem, GovTricolor, GovFooter } from "@/components/layout/GovBranding";
import { formatRole } from "@/lib/utils";
import { Lock, Upload, MapPin, Shield, BadgeCheck, PlayCircle } from "lucide-react";

const FEATURES = [
  { icon: Upload, text: "Upload scanned registers and PDFs" },
  { icon: Shield, text: "Officer verification with source highlighting" },
  { icon: MapPin, text: "Parcel boundaries with area checks" },
  { icon: BadgeCheck, text: "Digitally signed, QR-verifiable records" },
];

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t, tx } = useLocale();
  const router = useRouter();
  const next = useSearchParams().get("next");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const loggedIn = await login(email, password);
      toast("Signed in", "success");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : getHomePathForRole(loggedIn.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--gov-bg)]">
      <GovHeader />
      <main className="flex-1 flex flex-col lg:flex-row">
        <section className="order-2 lg:order-1 lg:w-2/5 bg-[var(--gov-navy)] text-white px-6 py-8 sm:p-10 lg:p-12 flex flex-col justify-center">
          <GovEmblem className="hidden lg:block h-14 w-14 text-white/80 mb-6" />
          <h1 className="text-2xl lg:text-3xl font-bold leading-tight">{t(APP_NAME)}</h1>
          <p className="mt-3 text-white/75 text-sm leading-relaxed max-w-sm">
            {t("Land record digitization: scan enhancement, multilingual OCR, field extraction, validation, officer verification, GIS and signed certificates.")}
          </p>
          <ul className="mt-6 lg:mt-8 space-y-3 text-sm text-white/75">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-2">
                <Icon className="h-4 w-4 text-[var(--gov-saffron)] shrink-0 mt-0.5" /> {t(text)}
              </li>
            ))}
          </ul>
        </section>

        <section className="order-1 lg:order-2 flex-1 flex items-center justify-center px-4 py-8 sm:p-10">
          <div className="w-full max-w-md">
            <div className="gov-card overflow-hidden shadow-lg">
              <GovTricolor />
              <div className="p-6 sm:p-8">
                <h2 className="text-xl font-bold text-[var(--gov-navy)] text-center">{t("Sign in")}</h2>
                {DEMO_LOGINS.length > 0 && (
                  <>
                    <p className="text-center text-xs text-[var(--gov-text-muted)] mt-1 mb-4">{t("Training accounts — tap to fill")}</p>
                    <div className="grid grid-cols-2 gap-2 mb-6">
                      {DEMO_LOGINS.map((c) => (
                        <button
                          key={c.email}
                          type="button"
                          onClick={() => {
                            setEmail(c.email);
                            setPassword(c.password);
                          }}
                          className="rounded-lg border border-[var(--gov-border)] px-3 py-2 text-left text-xs font-semibold text-[var(--gov-navy)] hover:border-[var(--gov-navy)] hover:bg-[var(--gov-bg-subtle)]"
                        >
                          {t(formatRole(c.role))}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)] mb-1.5">{t("Email")}</label>
                    <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
                  </div>
                  <div>
                    <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)] mb-1.5">{t("Password")}</label>
                    <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                  </div>
                  {error && <p className="text-sm text-red-700" role="alert">{tx(error)}</p>}
                  <Button type="submit" loading={loading} className="w-full" size="lg">{t("Sign in")}</Button>
                </form>
                <p className="text-center text-sm text-[var(--gov-text-muted)] mt-4">
                  {t("New citizen user?")}{" "}
                  <Link href="/register" className="font-semibold text-[var(--gov-navy)] hover:underline">{t("Citizen registration")}</Link>
                </p>
                <Link
                  href="/walkthrough"
                  className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--gov-navy-light)] bg-blue-50/50 px-3 py-2 text-sm font-semibold text-[var(--gov-navy)] hover:bg-blue-50"
                >
                  <PlayCircle className="h-4 w-4" /> {t("View the workflow demo — no sign-in needed")}
                </Link>
                <p className="text-center text-xs text-[var(--gov-text-light)] mt-3 flex items-center justify-center gap-1">
                  <Lock className="h-3.5 w-3.5 shrink-0" /> {t("Accounts lock for 15 minutes after 5 failed attempts")}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <GovFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LoginForm />
    </Suspense>
  );
}
