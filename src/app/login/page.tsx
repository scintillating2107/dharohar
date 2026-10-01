"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DEMO_CREDENTIALS } from "@/lib/config";
import { getHomePathForRole } from "@/lib/citizen";
import { LoadingState } from "@/components/ui/States";
import { GovHeader, GovEmblem, GovTricolor } from "@/components/layout/GovBranding";
import { Lock, Play, Upload, MapPin, Shield } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { APP_NAME } from "@/lib/config";

const QUICK_ROLES = DEMO_CREDENTIALS.filter((c) =>
  ["DATA_OFFICER", "VERIFICATION_OFFICER", "CITIZEN", "ADMIN"].includes(c.role)
);

export default function LoginPage() {
  const [email, setEmail] = useState("data@dharohar.gov");
  const [password, setPassword] = useState("data123");
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const { locale, setLocale } = useLocale();
  const { toast } = useToast();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loggedIn = await login(email, password);
      toast("Signed in", "success");
      router.push(getHomePathForRole(loggedIn.role));
    } catch {
      toast("Invalid email or password", "error");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--gov-bg)]">
      <GovHeader />

      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="lg:w-2/5 bg-[var(--gov-navy)] text-white p-8 lg:p-12 flex flex-col justify-center">
          <GovEmblem className="h-14 w-14 text-white/80 mb-6" />
          <h1 className="text-3xl font-bold leading-tight">{APP_NAME}</h1>
          <p className="mt-3 text-white/70 text-sm leading-relaxed max-w-sm">
            Digitize legacy land records: upload, enhance scans, OCR, validate, verify, map, and certify.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/65">
            <li className="flex gap-2"><Upload className="h-4 w-4 text-[var(--gov-saffron)] shrink-0" /> Upload PDF or scan</li>
            <li className="flex gap-2"><Shield className="h-4 w-4 text-[var(--gov-saffron)] shrink-0" /> Officer verification</li>
            <li className="flex gap-2"><MapPin className="h-4 w-4 text-[var(--gov-saffron)] shrink-0" /> GIS parcel link</li>
          </ul>
          <Link href="/demo" className="mt-10">
            <Button size="lg" className="w-full sm:w-auto bg-[var(--gov-saffron)] text-[var(--gov-navy)] hover:brightness-105 border-0">
              <Play className="h-5 w-5" /> Open demo hub (no login)
            </Button>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="gov-card overflow-hidden shadow-lg">
              <GovTricolor />
              <div className="p-8">
                <h2 className="text-xl font-bold text-[var(--gov-navy)] text-center">Sign in</h2>
                <p className="text-center text-xs text-[var(--gov-text-muted)] mt-1 mb-6">
                  Training accounts below — tap a role to fill the form
                </p>

                <div className="grid grid-cols-2 gap-2 mb-6">
                  {QUICK_ROLES.map((cred) => (
                    <button
                      key={cred.email}
                      type="button"
                      onClick={() => fillDemo(cred.email, cred.password)}
                      className="rounded-lg border border-[var(--gov-border)] px-3 py-2.5 text-left hover:border-[var(--gov-navy)] hover:bg-[var(--gov-bg-subtle)] transition-colors"
                    >
                      <span className="text-xs font-semibold text-[var(--gov-navy)] block">
                        {cred.role.replace(/_/g, " ")}
                      </span>
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    aria-label="Email"
                  />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    aria-label="Password"
                  />
                  <div className="flex gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => setLocale("hi")}
                      className={`flex-1 rounded-md border px-3 py-2 text-xs ${locale === "hi" ? "border-[var(--gov-navy)] font-semibold" : "border-[var(--gov-border)]"}`}
                    >
                      हिन्दी
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocale("en")}
                      className={`flex-1 rounded-md border px-3 py-2 text-xs ${locale === "en" ? "border-[var(--gov-navy)] font-semibold" : "border-[var(--gov-border)]"}`}
                    >
                      English
                    </button>
                  </div>
                  <Button type="submit" loading={loading} className="w-full" size="lg">
                    Sign in
                  </Button>
                </form>

                <p className="text-center text-sm text-[var(--gov-text-muted)] mt-4">
                  <Link href="/register" className="font-semibold text-[var(--gov-navy)] hover:underline">
                    Citizen registration
                  </Link>
                </p>
                <p className="text-center text-xs text-[var(--gov-text-light)] mt-3 flex items-center justify-center gap-1">
                  <Lock className="h-3.5 w-3.5" /> Demo environment
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
