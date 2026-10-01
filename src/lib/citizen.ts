import type { LandRecord, User } from "@/types";

export function isCitizenRole(role: string): boolean {
  return role === "CITIZEN";
}

export { getHomePathForRole } from "@/lib/dashboard-routes";

/** Match land records registered in the citizen's name (demo: user.name vs owner_name). */
export function recordBelongsToCitizen(record: LandRecord, user: User): boolean {
  const owner = record.owner_name.trim().toLowerCase();
  const name = user.name.trim().toLowerCase();
  if (!owner || !name) return false;
  return owner === name || owner.includes(name) || name.includes(owner);
}

export function citizenCanViewRecord(record: LandRecord, user: User): boolean {
  if (record.status === "VERIFIED") return true;
  return recordBelongsToCitizen(record, user);
}
