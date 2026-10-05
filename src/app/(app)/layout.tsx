"use client";

import { useAuth } from "@/contexts/AuthContext";
import { LoadingState } from "@/components/ui/States";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading…" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
