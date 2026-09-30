import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { runGeminiOCR } from "@/lib/services/local/ocr";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const documentId = formData.get("document_id");
    const image = formData.get("image");

    if (!documentId || typeof documentId !== "string") {
      return apiError("document_id is required");
    }

    if (!(image instanceof File)) {
      return apiError("image file is required");
    }

    if (!image.type.startsWith("image/")) {
      return apiError("Only image files are supported");
    }

    const imageBuffer = Buffer.from(await image.arrayBuffer());

    const result = await runGeminiOCR(
      documentId,
      imageBuffer,
      image.type
    );

    return apiSuccess(result);

  } catch (err) {
    console.error("Member 3 OCR error:", err);

    return apiError(
      err instanceof Error ? err.message : "OCR failed",
      500
    );
  }
}