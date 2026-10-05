"use client";

import { Check, Minus } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import type { UserRole } from "@/types";
import { formatRole } from "@/lib/utils";
import { ROLE_PERMISSIONS, type Permission } from "@/lib/config";

export const PERMISSION_ROWS: { permission: Permission; label: string }[] = [
  { permission: "upload", label: "Upload documents" },
  { permission: "documents", label: "View documents & OCR" },
  { permission: "verification", label: "Verify, approve & reject records" },
  { permission: "claims", label: "Review ownership claims" },
  { permission: "records", label: "View land records" },
  { permission: "gis_edit", label: "Edit parcel boundaries" },
  { permission: "audit", label: "Audit log & certificates" },
  { permission: "analytics", label: "Analytics" },
  { permission: "users", label: "Manage users" },
  { permission: "settings_admin", label: "System settings & master data" },
  { permission: "integrations", label: "API keys & webhooks" },
  { permission: "citizen", label: "Citizen portal" },
];

const ROLE_ORDER: UserRole[] = ["ADMIN", "VERIFICATION_OFFICER", "DATA_OFFICER", "SURVEY_OFFICER", "CITIZEN"];

/** Generated from ROLE_PERMISSIONS — the same table the server enforces. */
export function RolePermissionsMatrix() {
  const { t } = useLocale();
  return (
    <>
    <p className="text-sm text-[var(--gov-text-muted)] mb-3 sm:hidden">{t("Scroll sideways to see every role.")}</p>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-[var(--gov-text-muted)] border-b border-[var(--gov-border-light)]">
            <th className="py-2 pr-4 sticky left-0 bg-white">{t("Permission")}</th>
            {ROLE_ORDER.map((r) => (
              <th key={r} className="py-2 px-2 text-center min-w-[88px]">{t(formatRole(r))}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_ROWS.map((row) => (
            <tr key={row.permission} className="border-b border-[var(--gov-border-light)]">
              <td className="py-2 pr-4 font-medium text-[var(--gov-navy)] sticky left-0 bg-white">{t(row.label)}</td>
              {ROLE_ORDER.map((role) => (
                <td key={role} className="py-2 text-center">
                  {ROLE_PERMISSIONS[role].includes(row.permission) ? (
                    <Check className="h-4 w-4 text-[var(--gov-green)] mx-auto" aria-label={t("Allowed")} />
                  ) : (
                    <Minus className="h-4 w-4 text-[var(--gov-text-light)] mx-auto" aria-label={t("Not allowed")} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
