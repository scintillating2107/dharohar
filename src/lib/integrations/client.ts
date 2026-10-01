import { USE_MOCK_DATA } from "@/lib/config";

export const INTEGRATION_URLS = {
  imageProcessing:
    process.env.MEMBER2_IMAGE_API_URL || process.env.NEXT_PUBLIC_MEMBER2_IMAGE_API_URL || "",
  ocr: process.env.MEMBER3_OCR_API_URL || process.env.NEXT_PUBLIC_MEMBER3_OCR_API_URL || "",
  extraction:
    process.env.MEMBER4_EXTRACTION_API_URL ||
    process.env.NEXT_PUBLIC_MEMBER4_EXTRACTION_API_URL ||
    "",
  validation:
    process.env.MEMBER5_VALIDATION_API_URL ||
    process.env.NEXT_PUBLIC_MEMBER5_VALIDATION_API_URL ||
    "",
  database:
    process.env.MEMBER6_DATABASE_API_URL ||
    process.env.NEXT_PUBLIC_MEMBER6_DATABASE_API_URL ||
    "",
};

export class IntegrationError extends Error {
  constructor(
    message: string,
    public module: string,
    public retryable = true
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}

async function callExternal<T>(
  module: string,
  url: string,
  body: unknown
): Promise<T> {
  const integrationKey = process.env.INTEGRATION_SERVICE_KEY || "dharohar-local-dev-key";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Integration-Key": integrationKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new IntegrationError(
      `${module} service error: ${text}`,
      module,
      response.status >= 500
    );
  }

  return response.json() as Promise<T>;
}

async function callExternalGet<T>(module: string, url: string): Promise<T> {
  const integrationKey = process.env.INTEGRATION_SERVICE_KEY || "dharohar-local-dev-key";
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Integration-Key": integrationKey,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new IntegrationError(
      `${module} service error: ${text}`,
      module,
      response.status >= 500
    );
  }

  return response.json() as Promise<T>;
}

export function isMockMode(): boolean {
  return USE_MOCK_DATA;
}

export { callExternal, callExternalGet };
