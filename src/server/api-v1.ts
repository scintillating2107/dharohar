import { NextResponse } from "next/server";
import { HttpError } from "@/server/auth";
import type { RecordRow } from "@/server/repo";
import { iso } from "@/server/repo";

/** Public data contract for external systems (LRMS / DILRMP / GIS). Stable, versioned field names. */
export function v1Record(row: RecordRow) {
  return {
    record_id: row.id,
    version: row.version,
    status: row.status,
    owners: row.owners?.length ? row.owners : [{ name: row.ownerName, relation_name: row.fatherName ?? undefined }],
    owner_name: row.ownerName,
    father_name: row.fatherName,
    khasra_number: row.khasraNumber,
    khata_number: row.khataNumber,
    survey_number: row.surveyNumber,
    land_type: row.landType,
    area: row.area,
    area_unit: row.areaUnit,
    area_hectares: row.areaHectares,
    village: row.village,
    tehsil: row.tehsil,
    district: row.district,
    state: row.state,
    registration_number: row.registrationNumber,
    mutation_number: row.mutationNumber,
    mutation_date: row.mutationDate,
    record_year: row.recordYear,
    verified_at: iso(row.verifiedAt) ?? null,
    verified_by: row.verifiedBy,
    certificate: row.certificate
      ? { record_hash: row.certificate.record_hash, signature: row.certificate.signature, key_id: row.certificate.key_id, certified_at: row.certificate.certified_at }
      : null,
    updated_at: iso(row.updatedAt),
  };
}

export function v1Error(err: unknown) {
  if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error("[api/v1]", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
