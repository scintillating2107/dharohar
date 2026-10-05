"use client";

import { useEffect } from "react";
import { StatusPage } from "@/components/layout/StatusPage";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <StatusPage
      code="!"
      title="Something went wrong"
      description="An unexpected error occurred while showing this page. Your data is safe — please try again."
      onRetry={reset}
    />
  );
}
