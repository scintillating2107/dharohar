export const DEMO_RECORD_ID = "LR-2026-001245";
export const DEMO_DOCUMENT_ID = "DOC-DEMO-001";

export function allocateRecordId(records: { record_id: string }[]): string {
  const year = new Date().getFullYear();
  const prefix = `LR-${year}-`;
  const existing = records
    .map((r) => r.record_id)
    .filter((id) => id.startsWith(prefix))
    .map((id) => parseInt(id.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
}
