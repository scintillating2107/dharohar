import { getSessionPayload } from "@/lib/auth";
import { store } from "@/lib/store";
import { recordBelongsToCitizen, isCitizenRole } from "@/lib/citizen";
import { apiSuccess, unauthorized, forbidden } from "@/lib/api-utils";

export async function GET() {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const user = store.users.find((u) => u.id === session.userId);
  if (!user) return unauthorized();

  const role = user.role ?? session.role;
  if (!isCitizenRole(role)) {
    return forbidden("Citizen portal is only available to citizen accounts");
  }

  const district = user.district || "Lucknow";

  const myRecords = store.records.filter((r) => recordBelongsToCitizen(r, user));
  const verifiedInDistrict = store.records.filter(
    (r) => r.status === "VERIFIED" && r.district === district
  );

  const myApplications = store.documents.filter((d) => d.uploadedBy === user.id);

  const publicVerified = store.records
    .filter((r) => r.status === "VERIFIED" && r.district === district)
    .slice(0, 8)
    .map((r) => ({
      recordId: r.record_id,
      ownerName: r.owner_name,
      khasraNumber: r.khasra_number,
      village: r.village,
      tehsil: r.tehsil,
      district: r.district,
      area: r.area,
      areaUnit: r.area_unit,
      verifiedAt: r.verifiedAt || r.createdAt,
    }));

  const myRecordsSummary = myRecords.map((r) => ({
    recordId: r.record_id,
    ownerName: r.owner_name,
    khasraNumber: r.khasra_number,
    village: r.village,
    district: r.district,
    status: r.status,
    updatedAt: r.updatedAt || r.createdAt,
  }));

  const pendingCount = myRecords.filter((r) => r.status === "VERIFICATION_REQUIRED").length;

  return apiSuccess({
    user: { name: user.name, district, email: user.email },
    stats: {
      my_records: myRecords.length,
      my_verified: myRecords.filter((r) => r.status === "VERIFIED").length,
      pending_actions: pendingCount,
      district_verified_total: verifiedInDistrict.length,
      my_applications: myApplications.length,
    },
    myRecords: myRecordsSummary,
    myApplications: myApplications.slice(0, 5).map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      uploadedAt: d.uploadedAt,
    })),
    publicVerified,
    services: [
      {
        title: "Search verified land records",
        description: "Look up publicly verified khasra and ownership details in your district.",
        href: "/records?status=VERIFIED",
      },
      {
        title: "View land parcels on map",
        description: "See survey boundaries for verified records on the GIS map.",
        href: "/gis",
      },
      {
        title: "Download record copy",
        description: "Open a verified record to view field details and validation summary.",
        href: myRecords.find((r) => r.status === "VERIFIED")
          ? `/records/${myRecords.find((r) => r.status === "VERIFIED")!.record_id}`
          : "/records?status=VERIFIED",
      },
    ],
  });
}
