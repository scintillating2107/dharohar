"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DEMO_CREDENTIALS } from "@/lib/config";
import { getHomePathForRole } from "@/lib/citizen";
import { LoadingState } from "@/components/ui/States";
import { GovHeader, GovEmblem, GovTricolor } from "@/components/layout/GovBranding";
import {
  FileText,
  Shield,
  MapPin,
  CheckCircle2,
  Lock,
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) router.replace(getHomePathForRole(user.role));
  }, [user, authLoading, router]);

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gov-bg)]">
      <LoadingState message="Verifying session..." />
    </div>
  );
  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loggedIn = await login(email, password);
      toast("Login successful", "success");
      router.push(getHomePathForRole(loggedIn.role));
    } catch {
      toast("Invalid credentials. Please try again.", "error");
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

      <div className="flex-1 flex">
        {/* Left panel — official information */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 flex-col justify-between bg-[var(--gov-navy)] text-white p-12 xl:p-16 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-20 right-10">
              <GovEmblem className="h-64 w-64" />
            </div>
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs text-white/70 mb-8">
              <Shield className="h-3.5 w-3.5" />
              Secure Government Portal
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight">
              Digital Land Record<br />Management System
            </h1>
            <p className="mt-4 text-white/65 text-base leading-relaxed max-w-md">
              AI-powered digitization, validation, and human verification of land records —
              integrated with GIS and audit trail for transparent governance.
            </p>
          </div>

          <div className="relative z-10 space-y-5">
            {[
              { icon: FileText, label: "Upload & Digitize", desc: "Scan and process land record documents" },
              { icon: CheckCircle2, label: "Verify & Approve", desc: "Officer review with confidence scoring" },
              { icon: MapPin, label: "GIS Integration", desc: "Link records to cadastral parcels" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="rounded-lg bg-white/10 border border-white/15 p-2.5 flex-shrink-0">
                  <Icon className="h-5 w-5 text-[var(--gov-saffron)]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-white/55 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="relative z-10 text-xs text-white/35">
            Demo portal — not connected to live government databases
          </p>
        </div>

        {/* Right panel — login form */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="gov-card overflow-hidden shadow-lg">
              <GovTricolor />
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="rounded-full bg-[var(--gov-navy)]/8 p-2.5">
                    <Lock className="h-5 w-5 text-[var(--gov-navy)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--gov-navy)]">Officer Login</h2>
                    <p className="text-xs text-[var(--gov-text-muted)]">Authorized personnel only</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)] mb-1.5">
                      Official Email ID
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="officer@dharohar.gov"
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
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                  <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
                    Sign In to Portal
                  </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-[var(--gov-border-light)]">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--gov-text-muted)] mb-3">
                    Demo Access — Click to Fill
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {DEMO_CREDENTIALS.map((cred) => (
                      <button
                        key={cred.email}
                        type="button"
                        onClick={() => fillDemo(cred.email, cred.password)}
                        className="rounded-md border border-[var(--gov-border)] bg-[var(--gov-bg-subtle)] px-3 py-2.5 text-left hover:border-[var(--gov-navy-light)] hover:bg-white transition-all duration-150 group"
                      >
                        <span className="text-xs font-semibold text-[var(--gov-navy)] block group-hover:text-[var(--gov-navy-light)]">
                          {cred.role.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-[var(--gov-text-light)] truncate block mt-0.5">
                          {cred.email}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-[var(--gov-text-light)]">
              For assistance, contact the System Administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
