"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardPathForRole } from "@/lib/dashboard-routes";
import { LoadingState } from "@/components/ui/States";

export default function DashboardRedirectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(getDashboardPathForRole(user.role));
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <LoadingState message="Opening your dashboard..." />
    </div>
  );
}
