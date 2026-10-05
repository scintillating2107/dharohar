import { and, eq, inArray, sql } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { citizenClaims, documents, verificationTasks } from "@/server/db/schema";
import { listNotifications } from "@/server/notifications";
import { handle, ok } from "@/server/http";
import { hasPermission } from "@/lib/config";

const IN_FLIGHT = ["QUEUED", "PROCESSING", "IMAGE_PROCESSING", "OCR_PROCESSING", "EXTRACTION_PROCESSING", "VALIDATION_PROCESSING"];

/** In-app notifications plus live work-queue counters relevant to the user's role. */
export const GET = handle(async () => {
  const user = await requireUser();
  const db = await getDb();
  const { items, unread } = await listNotifications(user.id);
  const count = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;

  const pendingVerification = hasPermission(user.role, "verification")
    ? await count(
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(verificationTasks)
          .where(inArray(verificationTasks.status, ["PENDING", "IN_REVIEW"]))
      )
    : 0;
  const processingDocuments = hasPermission(user.role, "documents")
    ? await count(db.select({ n: sql<number>`count(*)::int` }).from(documents).where(inArray(documents.status, IN_FLIGHT)))
    : 0;
  const failedDocuments = hasPermission(user.role, "documents")
    ? await count(db.select({ n: sql<number>`count(*)::int` }).from(documents).where(eq(documents.status, "FAILED")))
    : 0;
  const pendingClaims = hasPermission(user.role, "claims")
    ? await count(db.select({ n: sql<number>`count(*)::int` }).from(citizenClaims).where(eq(citizenClaims.status, "PENDING")))
    : await count(
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(citizenClaims)
          .where(and(eq(citizenClaims.userId, user.id), eq(citizenClaims.status, "PENDING")))
      );

  return ok({
    items,
    unread,
    counts: { pendingVerification, processingDocuments, failedDocuments, pendingClaims },
  });
});
