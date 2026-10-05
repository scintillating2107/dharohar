import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { citizenClaims } from "@/server/db/schema";

/** Record ids a citizen has been linked to through an officer-approved ownership claim. */
export async function claimedRecordIds(userId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ recordId: citizenClaims.recordId })
    .from(citizenClaims)
    .where(and(eq(citizenClaims.userId, userId), eq(citizenClaims.status, "APPROVED")));
  return rows.map((r) => r.recordId);
}
