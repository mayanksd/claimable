"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * Shown instead of the ₹ hero when only the general policy wording was uploaded (no schedule):
 * honest about what we can and can't tell, with one way forward.
 */
export function WordingOnlyCard({ perkCount, onUpload }: { perkCount: number; onUpload: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <section className="rounded-3xl border-2 border-brand-line bg-white p-6 shadow-soft sm:p-8" aria-labelledby="wording-title">
      <h2 id="wording-title" className="text-xl font-bold sm:text-[28px] sm:leading-tight">
        📄 This is the general policy wording, not your personal policy.
      </h2>
      <p className="mt-3 text-base">
        We found <b>{perkCount} {perkCount === 1 ? "perk" : "perks"}</b> this plan can include — but your ₹ limits are in
        your schedule.
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Upload your full policy PDF (from your insurer&apos;s email or app) to see your exact perks and ₹ values.
      </p>
      <input
        ref={input}
        type="file"
        hidden
        accept="application/pdf,.pdf"
        onChange={(ev) => {
          const f = ev.target.files?.[0];
          ev.target.value = "";
          if (f) onUpload(f);
        }}
      />
      <Button variant="hero" size="lg" className="mt-5 h-12 w-full rounded-2xl text-base sm:w-auto sm:px-8" onClick={() => input.current?.click()}>
        Upload my policy →
      </Button>
    </section>
  );
}
