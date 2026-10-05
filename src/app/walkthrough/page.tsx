"use client";

import { Suspense } from "react";
import { WalkthroughView } from "@/components/showcase/WalkthroughView";
import { LoadingState } from "@/components/ui/States";

/** Public workflow walkthrough (no sign-in, no database needed). */
export default function WalkthroughPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <WalkthroughView />
    </Suspense>
  );
}
