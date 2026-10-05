/** OpenAPI 3.1 description of the external integration API. */
export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const record = {
    type: "object",
    properties: {
      record_id: { type: "string", example: "LR-2026-000001" },
      version: { type: "integer" },
      status: { type: "string", enum: ["VERIFIED", "VERIFICATION_REQUIRED", "REJECTED"] },
      owner_name: { type: "string" },
      father_name: { type: ["string", "null"] },
      owners: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" }, relation_name: { type: "string" }, relation_type: { type: "string" }, share: { type: "number" } },
        },
      },
      khasra_number: { type: "string" },
      khata_number: { type: "string" },
      survey_number: { type: ["string", "null"] },
      land_type: { type: ["string", "null"] },
      area: { type: "number" },
      area_unit: { type: "string" },
      area_hectares: { type: ["number", "null"] },
      village: { type: "string" },
      tehsil: { type: "string" },
      district: { type: "string" },
      state: { type: "string" },
      mutation_number: { type: ["string", "null"] },
      mutation_date: { type: ["string", "null"], format: "date" },
      registration_number: { type: ["string", "null"] },
      verified_at: { type: ["string", "null"], format: "date-time" },
      certificate: {
        type: ["object", "null"],
        properties: { record_hash: { type: "string" }, signature: { type: "string" }, key_id: { type: "string" }, certified_at: { type: "string" } },
      },
    },
  };
  const auth = [{ apiKey: [] }];
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Dharohar Land Records API",
      version: "1.0.0",
      description:
        "Read access to verified, digitally signed land records for LRMS, DILRMP and GIS systems. Create API keys under Integrations (admin).",
    },
    servers: [{ url: `${origin}/api/v1` }],
    components: {
      securitySchemes: { apiKey: { type: "http", scheme: "bearer", description: "Authorization: Bearer dh_xxxxxxxx_…" } },
      schemas: { Record: record },
    },
    paths: {
      "/records": {
        get: {
          summary: "List records",
          security: auth,
          parameters: ["district", "tehsil", "village", "state", "khasra", "updated_since", "limit", "offset", "status"].map((name) => ({
            name,
            in: "query",
            schema: { type: name === "limit" || name === "offset" ? "integer" : "string" },
          })),
          responses: { "200": { description: "Records", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Record" } }, total: { type: "integer" } } } } } } },
        },
      },
      "/records/{id}": {
        get: {
          summary: "Get a record",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Record" }, "404": { description: "Not found" } },
        },
      },
      "/records/{id}/certificate": {
        get: {
          summary: "Certificate and live verification (signature, record hash, scan hash, audit chain)",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Verification result" } },
        },
      },
      "/parcels": {
        get: {
          summary: "Parcels as GeoJSON FeatureCollection",
          security: auth,
          parameters: ["district", "village", "surveyed_only"].map((name) => ({ name, in: "query", schema: { type: "string" } })),
          responses: { "200": { description: "GeoJSON", content: { "application/geo+json": {} } } },
        },
      },
      "/export": {
        get: {
          summary: "Bulk export of verified records (CSV default, or format=json)",
          security: auth,
          parameters: [
            { name: "format", in: "query", schema: { type: "string", enum: ["csv", "json"] } },
            { name: "district", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Export file" } },
        },
      },
    },
    webhooks: {
      "record.verified": { post: { summary: "Sent when a record is approved and certified. Header X-Dharohar-Signature: sha256=HMAC(secret, body)." } },
      "record.rejected": { post: { summary: "Sent when a record is rejected." } },
      "record.extracted": { post: { summary: "Sent when AI extraction completes and a record awaits verification." } },
      "parcel.updated": { post: { summary: "Sent when a surveyed parcel boundary is set." } },
    },
  };
  return Response.json(spec);
}
