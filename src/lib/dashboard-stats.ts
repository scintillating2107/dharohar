import { store } from "./store";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function computeDashboardStats() {
  const documents = store.documents;
  const records = store.records;
  const tasks = store.verificationTasks;

  const processedStatuses = new Set([
    "OCR_PROCESSING",
    "OCR_COMPLETED",
    "EXTRACTION_PROCESSING",
    "EXTRACTED",
    "VALIDATION_PROCESSING",
    "VALIDATED",
    "VERIFICATION_REQUIRED",
    "VERIFIED",
  ]);

  const processed_documents = documents.filter((d) => processedStatuses.has(d.status)).length;
  const verified_records = records.filter((r) => r.status === "VERIFIED").length;
  const pending_verification = tasks.filter((t) => t.status === "PENDING" || t.status === "IN_REVIEW").length;
  const validation_issues = records.filter(
    (r) => r.validation?.validation_status === "REVIEW_REQUIRED" || (r.validation?.warnings?.length ?? 0) > 0
  ).length;

  const confidenceValues = records
    .map((r) => r.averageConfidence)
    .filter((value) => typeof value === "number" && value > 0);
  const average_confidence =
    confidenceValues.length > 0
      ? (confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) * 100
      : 0;

  return {
    total_documents: documents.length,
    processed_documents,
    verified_records,
    pending_verification,
    validation_issues,
    average_confidence: Math.round(average_confidence * 10) / 10,
  };
}

export function computeStateProgress() {
  const byState = new Map<string, { total: number; verified: number }>();

  for (const record of store.records) {
    const state = record.state || "Unknown";
    const current = byState.get(state) || { total: 0, verified: 0 };
    current.total += 1;
    if (record.status === "VERIFIED") current.verified += 1;
    byState.set(state, current);
  }

  return Array.from(byState.entries())
    .map(([state, value]) => ({
      state,
      total: value.total,
      verified: value.verified,
      processed: value.total,
      percentage: value.total > 0 ? Math.round((value.verified / value.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function computeDistrictProgress() {
  const byDistrict = new Map<string, { district: string; state: string; total: number; verified: number }>();

  for (const record of store.records) {
    const district = record.district || "Unknown";
    const state = record.state || "Unknown";
    const key = `${district}|${state}`;
    const current = byDistrict.get(key) || { district, state, total: 0, verified: 0 };
    current.total += 1;
    if (record.status === "VERIFIED") current.verified += 1;
    byDistrict.set(key, current);
  }

  return Array.from(byDistrict.values())
    .map((value) => ({
      district: value.district,
      state: value.state,
      total: value.total,
      processed: value.total,
      verified: value.verified,
      percentage: value.total > 0 ? Math.round((value.verified / value.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function computeProcessingChart() {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: MONTHS[date.getMonth()],
      uploaded: 0,
      processed: 0,
      verified: 0,
    };
  });

  const bucket = new Map(months.map((entry) => [entry.key, entry]));

  for (const doc of store.documents) {
    const uploadedAt = new Date(doc.uploadedAt);
    const key = `${uploadedAt.getFullYear()}-${uploadedAt.getMonth()}`;
    const entry = bucket.get(key);
    if (!entry) continue;
    entry.uploaded += 1;
    if (doc.status !== "UPLOADED" && doc.status !== "FAILED") entry.processed += 1;
    if (doc.status === "VERIFIED") entry.verified += 1;
  }

  return months.map(({ month, uploaded, processed, verified }) => ({
    month,
    uploaded,
    processed,
    verified,
  }));
}

export function computeVerificationChart() {
  const counts = {
    Approved: 0,
    Pending: 0,
    Rejected: 0,
    "Sent Back": 0,
  };

  for (const task of store.verificationTasks) {
    if (task.status === "APPROVED") counts.Approved += 1;
    else if (task.status === "REJECTED") counts.Rejected += 1;
    else if (task.status === "SENT_BACK") counts["Sent Back"] += 1;
    else counts.Pending += 1;
  }

  return [
    { name: "Approved", value: counts.Approved, color: "#1a7f37" },
    { name: "Pending", value: counts.Pending, color: "#e8750a" },
    { name: "Rejected", value: counts.Rejected, color: "#dc2626" },
    { name: "Sent Back", value: counts["Sent Back"], color: "#64748b" },
  ];
}

export function computeErrorCategories() {
  return [
    { name: "OCR uncertainty", count: 48 },
    { name: "Missing fields", count: 36 },
    { name: "Area mismatch", count: 22 },
    { name: "Duplicate record", count: 14 },
    { name: "Location mismatch", count: 12 },
    { name: "Other", count: 10 },
  ];
}

export function computeValidationChart() {
  const counts = { Valid: 0, "Review Required": 0, Invalid: 0 };

  for (const record of store.records) {
    const status = record.validation?.validation_status;
    if (status === "VALID") counts.Valid += 1;
    else if (status === "INVALID") counts.Invalid += 1;
    else counts["Review Required"] += 1;
  }

  return [
    { name: "Valid", value: counts.Valid, color: "#1a7f37" },
    { name: "Review Required", value: counts["Review Required"], color: "#e8750a" },
    { name: "Invalid", value: counts.Invalid, color: "#dc2626" },
  ];
}
