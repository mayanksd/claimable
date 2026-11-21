import type { Extraction } from "@/lib/schema";
import { inr, inrShort } from "@/lib/format";

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
  const max = Math.max(perks, premium, 1);
  const ratio = heroValue.ratioToPremium || (premium ? perks / premium : 0);

  return (
    <section
      className="grid items-center gap-5 rounded-2xl p-7 text-white md:grid-cols-[1.4fr_1fr]"
      style={{ background: "radial-gradient(120% 140% at 0% 0%, #4f46e5 0%, #7c3aed 55%, #a21caf 100%)" }}
    >
      <div>
        <div className="font-semibold opacity-85">
          {policy.product} · {inrShort(policy.sumInsuredInr)} sum insured
        </div>
        <div className="my-1 text-5xl font-extrabold tracking-tight sm:text-[56px]">{inr(perks)}</div>
        <div className="opacity-90">of perks you can claim every year, without being hospitalised.</div>
      </div>
      <div className="rounded-[14px] bg-white/12 p-4">
        <div className="font-bold">{ratio.toFixed(1)}× your premium</div>
        <Bar pct={(perks / max) * 100} />
        <div className="text-[13px] opacity-90">Perks {inr(perks)}</div>
        <Bar pct={(premium / max) * 100} />
        <div className="text-[13px] opacity-90">Annual premium {inr(premium)}</div>
      </div>
    </section>
  );
}
