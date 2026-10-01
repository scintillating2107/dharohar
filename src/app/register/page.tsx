"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getHomePathForRole } from "@/lib/citizen";
import { LoadingState } from "@/components/ui/States";
import { GovHeader, GovTricolor } from "@/components/layout/GovBranding";
import { APP_NAME } from "@/lib/config";
import { PS_DEPARTMENT } from "@/lib/problem-statement";
import { apiPost } from "@/lib/api-client";

export default function RegisterPage() {
  const [name, setName] = useState("Ramesh Singh");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, refresh } = useAuth();
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
      await apiPost("/api/auth/register", { name, email, password });
      await refresh();
      toast("Account created — welcome to the citizen portal", "success");
      router.push("/citizen/dashboard");
    } catch {
      toast("Could not create account. Try a different email.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--gov-bg)]">
      <GovHeader />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md gov-card overflow-hidden shadow-lg">
          <GovTricolor />
          <div className="p-8">
            <div className="text-center mb-6">
              <p className="text-2xl font-bold text-[var(--gov-navy)]">Citizen registration</p>
              <p className="text-sm text-[var(--gov-text-muted)]">{APP_NAME} · {PS_DEPARTMENT}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)] mb-1.5">
                  Full name (as on record)
                </label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)] mb-1.5">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)] mb-1.5">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" loading={loading} className="w-full" size="lg">
                Create citizen account
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-[var(--gov-text-muted)]">
              Already registered?{" "}
              <Link href="/login" className="font-semibold text-[var(--gov-navy)] hover:underline">
                Sign in
              </Link>
            </p>
            <p className="mt-4 text-center text-xs text-[var(--gov-text-light)]">
              Training demo — officers should use{" "}
              <Link href="/login" className="underline">sign in</Link> with department accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
