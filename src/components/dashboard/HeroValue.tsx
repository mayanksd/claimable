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
      className={`relative grid items-center gap-5 overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-brand/25 sm:p-8 ${knownPremium ? "md:grid-cols-[1.4fr_1fr]" : ""}`}
      style={{ background: "radial-gradient(130% 150% at 0% 0%, #4f46e5 0%, #7c3aed 50%, #e2557a 85%, #ff7a59 100%)" }}
    >
      <div>
        <div className="text-xl font-semibold opacity-90">You&apos;re sitting on</div>
        <div className="font-display my-1 text-[48px] leading-none font-extrabold tracking-tight tabular-nums drop-shadow-sm sm:text-[64px]" aria-label={inr(perks)}>
          {!knownPremium && <span className="mr-2 text-xl font-bold opacity-90">up to</span>}
          {inr(shown)}
        </div>
        <div className="text-xl font-semibold">of perks this year 🎉</div>
        <div className="mt-2 text-sm opacity-80">{sub}</div>
      </div>
      {knownPremium && (
        <div className="rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
          <div className="font-bold">{ratio.toFixed(1)}× your premium</div>
          <Bar pct={(perks / max) * 100} />
          <div className="text-sm opacity-90">Perks {inr(perks)}</div>
          <Bar pct={(premium / max) * 100} />
          <div className="text-sm opacity-90">Annual premium {inr(premium)}</div>
        </div>
      )}
    </section>
  );
}
