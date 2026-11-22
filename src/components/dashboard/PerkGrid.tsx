"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
type Props = {
  perks: Extraction["perks"];
  policyText: string;
  claimed: Set<string>;
  onToggleClaimed: (id: string) => void;
  checkupResetNote: string | null;
  sumInsuredInr?: number;
  /** e.g. "Perks this plan can include" for wording-only uploads. */
  title?: string;
  /** Opens the check-up agent instead of the inline planner. */
  onMaxCheckup?: () => void;
};

export function PerkGrid({ perks, policyText, claimed, onToggleClaimed, checkupResetNote, sumInsuredInr = 0, title = "Use these this week", onMaxCheckup }: Props) {
  const [open, setOpen] = useState(false);
  const [planFor, setPlanFor] = useState<string | null>(null);

  // The check-up card gets a "Max my ₹X →" button; the planner opens full-width right after its grid.
  const card = (p: Perk, i: number) => (
    <motion.div
      key={p.id}
      className="flex"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: i * 0.05, ease: "easeOut" }}
    >
      <PerkCard
        perk={p}
        maxOpen={planFor === p.id}
        claimed={claimed.has(p.id)}
        onToggleClaimed={() => onToggleClaimed(p.id)}
        resetNote={checkupResetNote}
        sumInsuredInr={sumInsuredInr}
        onMaxCheckup={isCheckupPerk(p) ? (onMaxCheckup ?? (() => setPlanFor((id) => (id === p.id ? null : p.id)))) : undefined}
      />
    </motion.div>
  );
  const planner = (items: Perk[]) => {
    const p = items.find((x) => x.id === planFor);
    return p?.capInr ? <CheckupPlanner limitInr={p.capInr} policyText={policyText} onClose={() => setPlanFor(null)} /> : null;
  };
  const top = topPerks(perks, 3, sumInsuredInr);
  const rest = perks.filter((p) => !top.includes(p));
  if (!perks.length) return null;

  return (
    <section>
      <SectionTitle title={title} hint="biggest value first" />
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
            className="mt-3.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border bg-white py-3 text-sm font-semibold text-brand hover:bg-brand-soft"
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
