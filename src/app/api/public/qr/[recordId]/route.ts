import QRCode from "qrcode";
import { env } from "@/server/env";
import { fail, handle } from "@/server/http";

/** PNG QR code pointing at the public verification page for a record. */
export const GET = handle(async (request: Request, ctx: { params: Promise<{ recordId: string }> }) => {
  const { recordId } = await ctx.params;
  if (!/^LR-\d{4}-\d{6}$/.test(recordId)) return fail("Invalid record id", 400);
  const origin = env.isProd ? env.appUrl : new URL(request.url).origin;
  const png = await QRCode.toBuffer(`${origin}/verify/${recordId}`, { type: "png", width: 320, margin: 1, errorCorrectionLevel: "M" });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
});
