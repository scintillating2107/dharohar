import { requireApiAccess } from "@/server/auth";
import { getRecordRow } from "@/server/repo";
import { v1Error, v1Record } from "@/server/api-v1";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAccess(request, "records:read");
    const { id } = await ctx.params;
    const row = await getRecordRow(id);
    if (!row) return Response.json({ error: "Record not found" }, { status: 404 });
    return Response.json({ data: v1Record(row) });
  } catch (err) {
    return v1Error(err);
  }
}
