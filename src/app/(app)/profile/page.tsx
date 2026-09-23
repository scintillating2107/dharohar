"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { formatRole, formatDateShort } from "@/lib/utils";
import { apiGet } from "@/lib/api-client";
import { LoadingState } from "@/components/ui/States";

interface IntegrationHealth {
  mock_mode: boolean;
  modules: Record<string, { status: "mock" | "local" | "connected" | "unconfigured"; url?: string }>;
}

const MODULE_LABELS: Record<string, string> = {
  member2_image: "Member 2 — Image Processing",
  member3_ocr: "Member 3 — OCR",
  member4_extraction: "Member 4 — Field Extraction",
  member5_validation: "Member 5 — Validation",
  member6_database: "Member 6 — Database/GIS",
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [health, setHealth] = useState<IntegrationHealth | null>(null);

  useEffect(() => {
    apiGet<IntegrationHealth>("/api/integrations/health")
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  if (!user) return null;

  const statusVariant = (status: string) => {
    if (status === "connected") return "success";
    if (status === "local") return "success";
    if (status === "mock") return "info";
    return "neutral";
  };

  return (
    <AppLayout title="Profile">
      <div className="max-w-2xl space-y-6">
        <Card title="User Profile">
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900 mt-1">{user.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900 mt-1">{user.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Role</dt>
              <dd className="mt-1"><Badge variant="info">{formatRole(user.role)}</Badge></dd>
            </div>
            {user.district && (
              <div>
                <dt className="text-slate-500">District</dt>
                <dd className="font-medium text-slate-900 mt-1">{user.district}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500">Member Since</dt>
              <dd className="font-medium text-slate-900 mt-1">{formatDateShort(user.createdAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Integration Status">
          {!health ? (
            <LoadingState message="Checking integrations..." />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-slate-600">Pipeline Mode:</span>
                <Badge variant={health.mock_mode ? "info" : "success"}>
                  {health.mock_mode ? "Mock" : "Live (file-based pipeline)"}
                </Badge>
              </div>
              {Object.entries(health.modules).map(([key, mod]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-700">{MODULE_LABELS[key] || key}</span>
                  <Badge variant={statusVariant(mod.status)}>
                    {mod.status === "mock"
                      ? "Mock"
                      : mod.status === "connected"
                        ? "Connected"
                        : mod.status === "local"
                          ? "Local pipeline"
                          : "Not Configured"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
