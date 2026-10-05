import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";

/** Liveness/readiness probe for load balancers and container orchestrators. */
export async function GET() {
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok" });
  } catch (err) {
    return Response.json({ status: "error", error: err instanceof Error ? err.message : String(err) }, { status: 503 });
  }
}
