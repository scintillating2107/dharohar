"use client";

import { Suspense } from "react";
import { ShowcaseView } from "@/components/showcase/ShowcaseView";
import { LoadingState } from "@/components/ui/States";

export default function ShowcasePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ShowcaseView />
    </Suspense>
  );
}
