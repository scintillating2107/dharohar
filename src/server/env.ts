/**
 * Central server configuration. In production, missing secrets fail fast instead of
 * silently falling back to values that are published in the repository.
 */

const isProd = process.env.NODE_ENV === "production";
const DEV_JWT_SECRET = "dharohar-dev-secret-change-in-production";

function required(name: string, devFallback: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (isProd && process.env.DHAROHAR_ALLOW_DEV_SECRETS !== "true") {
    throw new Error(`${name} must be set in production`);
  }
  return devFallback;
}

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function bool(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1" || value === "yes";
}

export type OcrEngine = "auto" | "tesseract" | "gemini";

export const env = {
  isProd,
  isServerless: process.env.VERCEL === "1" || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME),

  jwtSecret: required("JWT_SECRET", DEV_JWT_SECRET),

  /** Postgres connection string. When unset, an embedded Postgres (PGlite) is used. */
  databaseUrl: optional("DATABASE_URL"),
  /** Directory for the embedded Postgres data files (PGlite). */
  pgliteDir: optional("PGLITE_DIR"),

  storageDriver: (optional("STORAGE_DRIVER") ?? "local") as "local" | "s3",
  storageDir: optional("STORAGE_DIR"),
  s3: {
    bucket: optional("S3_BUCKET"),
    region: optional("S3_REGION") ?? "ap-south-1",
    endpoint: optional("S3_ENDPOINT"),
    accessKeyId: optional("S3_ACCESS_KEY_ID"),
    secretAccessKey: optional("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: bool("S3_FORCE_PATH_STYLE", false),
  },

  /** `inline` runs the job worker inside the web server; `external` expects `npm run worker`. */
  workerMode: (optional("WORKER_MODE") ?? "inline") as "inline" | "external",

  ocrEngine: (optional("OCR_ENGINE") ?? "auto") as OcrEngine,
  geminiApiKey: optional("GEMINI_API_KEY"),
  geminiModel: optional("GEMINI_MODEL") ?? "gemini-2.5-flash",
  tesseractCacheDir: optional("TESSERACT_CACHE_DIR"),

  /** Optional external Member 2 ML service (RealESRGAN + PaddleOCR). */
  mlServiceUrl: optional("MEMBER2_IMAGE_API_URL"),
  integrationKey: required("INTEGRATION_SERVICE_KEY", "dharohar-local-dev-key"),

  /** Ed25519 private key (PKCS8 PEM, or base64 of it) used to sign certificates. */
  certSigningKey: optional("CERT_SIGNING_KEY"),

  appUrl: optional("APP_URL") ?? "http://localhost:3000",

  geocoder: (optional("GEOCODER") ?? "none") as "none" | "nominatim",

  smtp: {
    host: optional("SMTP_HOST"),
    port: Number(optional("SMTP_PORT") ?? 587),
    user: optional("SMTP_USER"),
    pass: optional("SMTP_PASS"),
    from: optional("SMTP_FROM") ?? "Dharohar <no-reply@dharohar.local>",
    secure: bool("SMTP_SECURE", false),
  },
  smsWebhookUrl: optional("SMS_WEBHOOK_URL"),

  seedDemoUsers: bool("SEED_DEMO_USERS", !isProd),
  /** Creates the first administrator on an empty database (production bootstrap). */
  bootstrapAdmin: {
    email: optional("BOOTSTRAP_ADMIN_EMAIL"),
    password: optional("BOOTSTRAP_ADMIN_PASSWORD"),
    name: optional("BOOTSTRAP_ADMIN_NAME") ?? "System Administrator",
  },
};

export function geminiEnabled(): boolean {
  return Boolean(env.geminiApiKey) && env.ocrEngine !== "tesseract";
}
