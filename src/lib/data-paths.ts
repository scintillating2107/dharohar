import path from "path";

/** Writable data root — Vercel/serverless only allows /tmp. */
export function getDataRoot(): string {
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "dharohar-data");
  }
  return path.join(process.cwd(), "data");
}

export function getUploadsRoot(): string {
  return path.join(getDataRoot(), "uploads");
}
