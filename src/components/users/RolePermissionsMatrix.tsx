import { Check, Minus } from "lucide-react";
import type { UserRole } from "@/types";
import { formatRole } from "@/lib/utils";

const ACTIONS = ["Upload", "Edit", "Verify", "Delete", "GIS", "Audit"] as const;

/** Rows align with ROLE_PERMISSIONS in config (demo matrix). */
const MATRIX: Record<UserRole, boolean[]> = {
  ADMIN: [true, true, true, true, true, true],
  VERIFICATION_OFFICER: [true, true, true, false, false, true],
  DATA_OFFICER: [true, true, false, false, false, true],
  SURVEY_OFFICER: [false, false, false, false, true, true],
  CITIZEN: [false, false, false, false, true, false],
};

const ROLE_ORDER: UserRole[] = [
  "ADMIN",
  "VERIFICATION_OFFICER",
  "DATA_OFFICER",
  "SURVEY_OFFICER",
  "CITIZEN",
];

export function RolePermissionsMatrix() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-[var(--gov-text-muted)] border-b border-[var(--gov-border-light)]">
            <th className="py-2 pr-4">Action</th>
            {ROLE_ORDER.map((r) => (
              <th key={r} className="py-2 px-2 text-center min-w-[88px]">{formatRole(r)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ACTIONS.map((action, row) => (
            <tr key={action} className="border-b border-[var(--gov-border-light)]">
              <td className="py-2 font-medium text-[var(--gov-navy)]">{action}</td>
              {ROLE_ORDER.map((role) => {
                const allowed = MATRIX[role][row];
                return (
                  <td key={role} className="py-2 text-center">
                    {allowed ? (
                      <Check className="h-4 w-4 text-[var(--gov-green)] mx-auto" />
                    ) : (
                      <Minus className="h-4 w-4 text-[var(--gov-text-light)] mx-auto" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
