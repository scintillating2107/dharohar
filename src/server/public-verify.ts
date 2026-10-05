import { verifyCertificate, publicKeyInfo } from "@/server/certification";
import { getDocumentRow, getRecordRow } from "@/server/repo";

/** Public, tamper-evidence check of a certified record (what a QR code on a printed copy opens). */
export async function publicVerification(recordId: string) {
  const record = await getRecordRow(recordId);
  if (!record) return null;
  const document = await getDocumentRow(record.documentId);
  const result = await verifyCertificate(record, document);
  const key = await publicKeyInfo();
  return {
    record_id: record.id,
    valid: result.valid,
    checks: result.checks,
    certificate: result.certificate,
    public_key: { key_id: key.keyId, pem: key.publicKeyPem },
    summary:
      record.status === "VERIFIED"
        ? {
            owner_name: record.ownerName,
            father_name: record.fatherName,
            owners: record.owners,
            khasra_number: record.khasraNumber,
            khata_number: record.khataNumber,
            area: record.area,
            area_unit: record.areaUnit,
            area_hectares: record.areaHectares,
            land_type: record.landType,
            village: record.village,
            tehsil: record.tehsil,
            district: record.district,
            state: record.state,
            mutation_number: record.mutationNumber,
            mutation_date: record.mutationDate,
            version: record.version,
            verified_at: record.verifiedAt ? new Date(record.verifiedAt).toISOString() : null,
            verified_by: record.verifiedBy,
          }
        : null,
  };
}
