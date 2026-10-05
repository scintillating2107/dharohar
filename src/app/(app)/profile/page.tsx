"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { formatRole, formatDateShort, formatDate } from "@/lib/utils";
import { ROLE_PERMISSIONS } from "@/lib/config";
import { useLocale } from "@/contexts/LocaleContext";
import { PERMISSION_ROWS } from "@/components/users/RolePermissionsMatrix";

const EXTRA_PERMISSION_LABELS: Record<string, string> = { dashboard: "Dashboard", validation: "Validation", gis: "Map", profile: "Profile" };

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useLocale();
  if (!user) return null;

  return (
    <AppLayout title="Profile">
      <div className="max-w-2xl space-y-6">
        <Card title="Your account">
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><dt className="text-[var(--gov-text-muted)]">{t("Name")}</dt><dd className="font-medium mt-1">{user.name}</dd></div>
            <div><dt className="text-[var(--gov-text-muted)]">{t("Email")}</dt><dd className="font-medium mt-1">{user.email}</dd></div>
            <div><dt className="text-[var(--gov-text-muted)]">{t("Role")}</dt><dd className="mt-1"><Badge variant="info">{t(formatRole(user.role))}</Badge></dd></div>
            <div><dt className="text-[var(--gov-text-muted)]">{t("District")}</dt><dd className="font-medium mt-1">{user.district ? t(user.district) : "—"}</dd></div>
            <div><dt className="text-[var(--gov-text-muted)]">{t("Mobile")}</dt><dd className="font-medium mt-1">{user.phone ?? "—"}</dd></div>
            <div><dt className="text-[var(--gov-text-muted)]">{t("Member since")}</dt><dd className="font-medium mt-1">{formatDateShort(user.createdAt)}</dd></div>
            {user.lastLoginAt && <div><dt className="text-[var(--gov-text-muted)]">{t("Last sign-in")}</dt><dd className="font-medium mt-1">{formatDate(user.lastLoginAt)}</dd></div>}
          </dl>
          <Link href="/settings" className="inline-block mt-4">
            <Button variant="outline" size="sm">{t("Notifications & password")}</Button>
          </Link>
        </Card>
        <Card title="What you can do">
          <div className="flex flex-wrap gap-1.5">
            {ROLE_PERMISSIONS[user.role].map((p) => (
              <Badge key={p} variant="neutral">{t(PERMISSION_ROWS.find((r) => r.permission === p)?.label ?? EXTRA_PERMISSION_LABELS[p] ?? p.replace(/_/g, " "))}</Badge>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
