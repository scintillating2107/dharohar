import { requireApiAccess } from "@/server/auth";
import { publicVerification } from "@/server/public-verify";
import { v1Error } from "@/server/api-v1";

/** Certificate plus an independent re-verification of signature, record hash, scan hash and audit chain. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAccess(request, "certificates:read");
    const { id } = await ctx.params;
    const result = await publicVerification(id);
    if (!result) return Response.json({ error: "Record not found" }, { status: 404 });
    return Response.json({ data: result });
  } catch (err) {
    return v1Error(err);
  }
}
