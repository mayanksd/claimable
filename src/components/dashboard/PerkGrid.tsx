"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Extraction } from "@/lib/schema";
import { isCheckupPerk, topPerks, type Perk } from "@/lib/perks";
import { PerkCard } from "./PerkCard";
import { CheckupPlanner } from "./CheckupPlanner";
import { SectionTitle } from "./SectionTitle";

const GROUPS: { key: Extraction["perks"][number]["category"]; title: string }[] = [
  { key: "use_now", title: "Any time" },
  { key: "good_to_know", title: "Good to know" },
  { key: "emergency", title: "In an emergency" },
];

const grid = "grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3";

/** "Use these this week" (top 3, easy first) + "Show all perks (N)" for the rest, grouped by category. */
export function PerkGrid({ perks, policyText }: { perks: Extraction["perks"]; policyText: string }) {
  const [open, setOpen] = useState(false);
  const [planFor, setPlanFor] = useState<string | null>(null);

  // The check-up card gets a "Max my ₹X →" button; the planner opens full-width right after its grid.
  const card = (p: Perk) => (
    <PerkCard
      key={p.id}
      perk={p}
      maxOpen={planFor === p.id}
      onMaxCheckup={isCheckupPerk(p) ? () => setPlanFor((id) => (id === p.id ? null : p.id)) : undefined}
    />
  );
  const planner = (items: Perk[]) => {
    const p = items.find((x) => x.id === planFor);
    return p?.capInr ? <CheckupPlanner limitInr={p.capInr} policyText={policyText} onClose={() => setPlanFor(null)} /> : null;
  };
  const top = topPerks(perks);
  const rest = perks.filter((p) => !top.includes(p));
  if (!perks.length) return null;

  return (
    <section>
      <SectionTitle title="Use these this week" hint="biggest value first" />
      <div className={grid}>
        {top.map(card)}
        {planner(top)}
      </div>

      {rest.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mt-3.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border bg-white py-2.5 text-sm font-semibold text-brand hover:bg-brand-soft"
          >
            {open ? "Show fewer perks" : `Show all perks (${perks.length})`}
            <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open &&
            GROUPS.map((g) => {
              const items = rest.filter((p) => p.category === g.key);
              if (!items.length) return null;
              return (
                <div key={g.key}>
                  <h3 className="mt-5 mb-2.5 text-sm font-bold text-muted-foreground">{g.title}</h3>
                  <div className={grid}>
                    {items.map(card)}
                    {planner(items)}
                  </div>
                </div>
              );
            })}
        </>
      )}
    </section>
  );
}
