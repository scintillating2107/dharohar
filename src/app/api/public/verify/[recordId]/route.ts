import { publicVerification } from "@/server/public-verify";
import { fail, handle, ok } from "@/server/http";

export const GET = handle(async (_request: Request, ctx: { params: Promise<{ recordId: string }> }) => {
  const { recordId } = await ctx.params;
  if (!/^LR-\d{4}-\d{6}$/.test(recordId)) return fail("Invalid record id", 400);
  const result = await publicVerification(recordId);
  if (!result) return fail("Record not found", 404);
  return ok(result);
});
