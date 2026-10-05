import { requireUser } from "@/server/auth";
import { claimedRecordIds } from "@/server/citizen";
import { publicVerification } from "@/server/public-verify";
import { getRecordRow } from "@/server/repo";
import { fail, handle, ok } from "@/server/http";

export const GET = handle(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser("records");
  const { id } = await ctx.params;
  const row = await getRecordRow(id);
  if (!row) return fail("Record not found", 404);
  if (user.role === "CITIZEN" && row.status !== "VERIFIED" && !(await claimedRecordIds(user.id)).includes(id)) {
    return fail("Forbidden", 403);
  }
  return ok(await publicVerification(id));
});
