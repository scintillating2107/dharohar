"use client";

import Link from "next/link";
import { AIWorkflowDemo } from "@/components/demo/AIWorkflowDemo";
import { GovFooter, GovHeader } from "@/components/layout/GovBranding";
import { Button } from "@/components/ui/Button";

export default function PublicDemoWorkflowPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[var(--gov-bg)] to-white">
      <GovHeader />
      <div className="border-b border-[var(--gov-border-light)] bg-[var(--gov-navy)] text-white">
        <div className="max-w-[1400px] mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold">Guided demo — full land record journey</p>
            <p className="text-xs text-white/65">Click Continue on each screen — no autoplay</p>
          </div>
          <div className="flex gap-2">
            <Link href="/login">
              <Button
                size="sm"
                variant="ghost"
                className="border border-white/35 text-white hover:bg-white/10 hover:text-white"
              >
                Sign in
              </Button>
            </Link>
            <Link href="/documents/upload">
              <Button size="sm" className="bg-[var(--gov-saffron)] text-[var(--gov-navy)] border-0">
                Try live upload
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
        <AIWorkflowDemo />
      </main>
      <GovFooter />
    </div>
  );
}
