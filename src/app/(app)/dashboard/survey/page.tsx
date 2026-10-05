import { redirect } from "next/navigation";

/** Role dashboards were merged into one role-aware dashboard. */
export default function LegacyDashboardRedirect() {
  redirect("/dashboard/overview");
}
