import { getSessionPayload } from "@/lib/auth";
import { store } from "@/lib/store";
import { apiSuccess, unauthorized } from "@/lib/api-utils";

export async function GET() {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const pendingVerification = store.verificationTasks.filter(
    (t) => t.status === "PENDING"
  ).length;

  const processingDocuments = store.documents.filter((d) =>
    ["PROCESSING", "IMAGE_PROCESSING", "OCR_PROCESSING", "EXTRACTION_PROCESSING", "VALIDATION_PROCESSING"].includes(d.status)
  ).length;

  const validationIssues = store.records.filter(
    (r) => r.validation?.validation_status === "REVIEW_REQUIRED"
  ).length;

  return apiSuccess({
    pendingVerification,
    processingDocuments,
    validationIssues,
    total: pendingVerification + processingDocuments,
  });
}
