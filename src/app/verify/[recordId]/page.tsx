import type { Metadata } from "next";
import { publicVerification } from "@/server/public-verify";
import { VerifyView, type VerifyResult } from "./VerifyView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Verify land record certificate — Dharohar" };

/** Public certificate verification page (target of the QR code on printed records). */
export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ recordId: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { recordId } = await params;
  const { print } = await searchParams;
  let unavailable = false;
  let result: VerifyResult = null;
  if (/^LR-\d{4}-\d{6}$/.test(recordId)) {
    try {
      result = await publicVerification(recordId);
    } catch (err) {
      console.error("[verify] verification unavailable:", err);
      unavailable = true;
    }
  }

  return <VerifyView recordId={recordId} result={result ? JSON.parse(JSON.stringify(result)) : null} unavailable={unavailable} print={Boolean(print)} />;
}
