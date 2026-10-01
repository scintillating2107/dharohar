"use client";

import Link from "next/link";
import { PublicShell } from "@/components/demo/PublicShell";
import { Button } from "@/components/ui/Button";
import { DEMO_RECORD_ID } from "@/lib/record-ids";

const STEPS = [
  {
    icon: "📄",
    title: "Digitize legacy scan",
    detail: "Upload, enhance image, OCR, extract fields, validate — officer walkthrough.",
    href: "/demo/workflow",
    cta: "Open walkthrough",
  },
  {
    icon: "🗺️",
    title: "GIS & parcel link",
    detail: "Register parcel, preview boundary, verify on interactive map.",
    href: "/demo/portal",
    cta: "GIS & certification demo",
  },
  {
    icon: "🛡️",
    title: "Officer verification",
    detail: "Human review queue for area mismatches and confidence flags.",
    href: "/login",
    cta: "Sign in as verifier",
  },
  {
    icon: "⛓️",
    title: "Trust / ledger layer",
    detail: "Certification hash, verify certificate, audit trail (demo extension).",
    href: "/trust/verify",
    cta: "Verify certificate",
  },
  {
    icon: "👤",
    title: "Citizen portal",
    detail: "Registration and view verified holdings.",
    href: "/register",
    cta: "Citizen register",
  },
];

export default function DemoHubPage() {
  return (
    <PublicShell
      title="Demo hub"
      subtitle="Choose a judge-friendly path: digitization pipeline, GIS + ledger story, or live modules after sign-in."
    >
      <div className="space-y-6">
        <section className="gov-card p-5 border-l-4 border-l-[var(--gov-saffron)]">
          <p className="text-sm font-semibold text-[var(--gov-navy)]">Suggested opening</p>
          <p className="mt-2 text-lg font-semibold text-[var(--gov-navy)] leading-snug max-w-2xl">
            Legacy registers become verified, GIS-linked, and tamper-evident digital records — with human approval at every critical step.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/demo/workflow">
              <Button>Start digitization demo</Button>
            </Link>
            <Link href="/demo/portal">
              <Button variant="outline">Start GIS & blockchain demo</Button>
            </Link>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STEPS.map((step, index) => (
            <div key={step.title} className="gov-card p-5 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{step.icon}</span>
                <span className="text-[10px] font-bold uppercase text-[var(--gov-text-muted)]">Part {index + 1}</span>
              </div>
              <h3 className="mt-3 font-semibold text-[var(--gov-navy)]">{step.title}</h3>
              <p className="mt-2 text-sm text-[var(--gov-text-muted)] flex-1">{step.detail}</p>
              <Link href={step.href} className="mt-4">
                <Button variant="outline" size="sm" className="w-full">{step.cta}</Button>
              </Link>
            </div>
          ))}
        </section>

        <section className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="gov-card p-4">
            <p className="font-semibold text-[var(--gov-navy)]">Sample record</p>
            <p className="mt-2 text-[var(--gov-text-muted)]">Pre-loaded verified record for 360° view.</p>
            <Link href={`/records/${DEMO_RECORD_ID}`} className="inline-block mt-3 text-[var(--gov-navy)] font-semibold text-xs hover:underline">
              {DEMO_RECORD_ID} →
            </Link>
          </div>
          <div className="gov-card p-4">
            <p className="font-semibold text-[var(--gov-navy)]">Training login</p>
            <p className="mt-2 text-[var(--gov-text-muted)]">data@dharohar.gov / data123 · verification@ / verify123</p>
            <Link href="/login" className="inline-block mt-3 text-[var(--gov-navy)] font-semibold text-xs hover:underline">
              Sign in →
            </Link>
          </div>
          <div className="gov-card p-4">
            <p className="font-semibold text-[var(--gov-navy)]">Best live combo</p>
            <p className="mt-2 text-[var(--gov-text-muted)]">Walkthrough → portal step 5 map → trust verify → sample record.</p>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
