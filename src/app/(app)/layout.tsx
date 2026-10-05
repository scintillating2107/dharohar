"use client";

import { useAuth } from "@/contexts/AuthContext";
import { LoadingState } from "@/components/ui/States";
import { useEffect } from "react";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Full navigation (not client routing) so the middleware sees the cleared session cookie
      const next = window.location.pathname + window.location.search;
      window.location.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message={loading ? "Loading…" : "Your session has ended. Opening sign-in…"} />
      </div>
    );
  }

  return <>{children}</>;
}
