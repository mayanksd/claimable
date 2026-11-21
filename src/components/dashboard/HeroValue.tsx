"use client";

import type { Extraction } from "@/lib/schema";
import { inr, inrShort } from "@/lib/format";
import { useCountUp } from "@/lib/client/useCountUp";

function Bar({ pct }: { pct: number }) {
  return (
    <div className="my-2 h-2.5 overflow-hidden rounded-full bg-white/20">
      <i className="block h-full rounded-full bg-white" style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function HeroValue({ policy, heroValue }: Pick<Extraction, "policy" | "heroValue">) {
  const perks = heroValue.annualPerksValueInr;
  const premium = policy.annualPremiumInr;
  const knownPremium = premium > 0;
  const shown = useCountUp(perks);
  const max = Math.max(perks, premium, 1);
  const ratio = heroValue.ratioToPremium || (knownPremium ? perks / premium : 0);
  const sub = [policy.product, policy.sumInsuredInr > 0 ? `${inrShort(policy.sumInsuredInr)} sum insured` : ""].filter(Boolean).join(" · ");

  return (
    <section
      className={`grid items-center gap-5 rounded-2xl p-6 text-white sm:p-7 ${knownPremium ? "md:grid-cols-[1.4fr_1fr]" : ""}`}
      style={{ background: "radial-gradient(120% 140% at 0% 0%, #4f46e5 0%, #7c3aed 55%, #a21caf 100%)" }}
    >
      <div>
        <div className="text-lg font-semibold opacity-90">You&apos;re sitting on</div>
        <div className="my-1 text-[44px] leading-none font-extrabold tracking-tight tabular-nums sm:text-[56px]" aria-label={inr(perks)}>
          {!knownPremium && <span className="mr-2 text-2xl font-bold opacity-90 sm:text-3xl">up to</span>}
          {inr(shown)}
        </div>
        <div className="text-lg font-semibold">of perks this year 🎉</div>
        <div className="mt-2 text-sm opacity-80">{sub}</div>
      </div>
      {knownPremium && (
        <div className="rounded-[14px] bg-white/12 p-4">
          <div className="font-bold">{ratio.toFixed(1)}× your premium</div>
          <Bar pct={(perks / max) * 100} />
          <div className="text-[13px] opacity-90">Perks {inr(perks)}</div>
          <Bar pct={(premium / max) * 100} />
          <div className="text-[13px] opacity-90">Annual premium {inr(premium)}</div>
        </div>
      )}
    </section>
  );
}
