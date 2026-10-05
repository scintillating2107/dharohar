import { requireUser } from "@/server/auth";
import { appendAudit } from "@/server/audit";
import { getDb, type DB } from "@/server/db/client";
import { parseBoundary, setSurveyedGeometry } from "@/server/gis";
import { getSettings } from "@/server/settings";
import { emitWebhookEvent } from "@/server/webhooks";
import { getParcelForRecord, getRecordRow } from "@/server/repo";
import { fail, handle, ok } from "@/server/http";

/**
 * Sets the surveyed boundary of a record's parcel. Accepts JSON `{ geometry }` (GeoJSON) or a
 * multipart upload of a .geojson / .json / .kml file. The polygon's geodesic area is checked
 * against the recorded area.
 */
export const PUT = handle(async (request: Request, ctx: { params: Promise<{ recordId: string }> }) => {
  const user = await requireUser("gis_edit");
  const { recordId } = await ctx.params;
  const record = await getRecordRow(recordId);
  if (!record) return fail("Record not found", 404);

  let geometry;
  try {
    const type = request.headers.get("content-type") ?? "";
    if (type.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return fail("Upload a GeoJSON or KML file");
      if (file.size > 5 * 1024 * 1024) return fail("Boundary file exceeds 5 MB");
      geometry = await parseBoundary(await file.text(), file.name);
    } else {
      const body = await request.json();
      geometry = await parseBoundary(JSON.stringify(body.geometry ?? body));
    }
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Invalid boundary", 400);
  }

  const settings = await getSettings();
  const db = await getDb();
  let result;
  try {
    result = await db.transaction(async (t) => {
      const tx = t as unknown as DB;
      const r = await setSurveyedGeometry(tx, record, geometry, user.id, settings.areaTolerancePct);
      await appendAudit(
        {
          action: "PARCEL_GEOMETRY_UPDATED",
          actor: user.id,
          actorName: user.name,
          recordId,
          documentId: record.documentId,
          details: `Surveyed boundary ${r.polygonAreaHa} ha${r.differencePct !== null ? `; ${r.differencePct}% vs recorded area${r.withinTolerance ? "" : " — exceeds tolerance"}` : ""}`,
        },
        tx
      );
      return r;
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Invalid boundary", 400);
  }
  await emitWebhookEvent("parcel.updated", { record_id: recordId, polygon_area_ha: result.polygonAreaHa });
  return ok({ parcel: await getParcelForRecord(recordId), check: result });
});
