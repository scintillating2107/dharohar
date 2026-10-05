import { redirect } from "next/navigation";

/** Old certificate-check URL; the public verification page now lives at /verify/[recordId]. */
export default async function TrustVerifyRedirect({ searchParams }: { searchParams: Promise<{ record?: string }> }) {
  const { record } = await searchParams;
  redirect(record ? `/verify/${encodeURIComponent(record)}` : "/trust");
}
