import { getSessionPayload } from "@/lib/auth";
import { store } from "@/lib/store";
import {
  computeDashboardStats,
  computeDistrictProgress,
  computeProcessingChart,
  computeStateProgress,
  computeValidationChart,
  computeVerificationChart,
  computeErrorCategories,
} from "@/lib/dashboard-stats";
import { apiSuccess, unauthorized } from "@/lib/api-utils";

export async function GET() {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const recentDocuments = store.documents.slice(0, 5).map((d) => ({
    id: d.id,
    name: d.name,
    status: d.status,
    uploadedAt: d.uploadedAt,
    uploadedBy: d.uploadedByName,
    district: d.district,
  }));

  const recentVerification = store.verificationTasks.slice(0, 5).map((t) => ({
    id: t.id,
    recordId: t.recordId,
    ownerName: t.ownerName,
    action: t.status,
    actor: t.assignedTo || "Unassigned",
    timestamp: t.updatedAt,
  }));

  const recentValidationIssues = store.records
    .filter((r) => r.validation?.warnings?.length)
    .slice(0, 5)
    .map((r) => ({
      recordId: r.record_id,
      ownerName: r.owner_name,
      warnings: r.validation?.warnings || [],
      score: r.validation?.validation_score || 0,
    }));

  return apiSuccess({
    stats: computeDashboardStats(),
    stateProgress: computeStateProgress(),
    districtProgress: computeDistrictProgress(),
    processingChart: computeProcessingChart(),
    verificationChart: computeVerificationChart(),
    validationChart: computeValidationChart(),
    recentDocuments,
    recentVerification,
    recentValidationIssues,
    errorCategories: computeErrorCategories(),
  });
}
