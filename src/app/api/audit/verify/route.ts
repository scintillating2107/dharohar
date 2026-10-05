import { requireUser } from "@/server/auth";
import { verifyAuditChain } from "@/server/audit";
import { handle, ok } from "@/server/http";

/** Recomputes the whole audit hash chain and reports the first broken entry, if any. */
export const GET = handle(async () => {
  await requireUser("audit");
  return ok(await verifyAuditChain());
});
