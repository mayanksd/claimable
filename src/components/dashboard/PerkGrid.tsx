import type { Extraction } from "@/lib/schema";
import { PerkCard } from "./PerkCard";
import { SectionTitle } from "./SectionTitle";

const GROUPS: { key: Extraction["perks"][number]["category"]; title: string; hint: string }[] = [
  { key: "use_now", title: "Use these now", hint: "use-it-or-lose-it each policy year" },
  { key: "good_to_know", title: "Good to know", hint: "for when you need them" },
  { key: "emergency", title: "In an emergency", hint: "keep these handy" },
];

type Category = Extraction["perks"][number]["category"];

export function PerkGrid({ perks, only }: { perks: Extraction["perks"]; only?: Category[] }) {
  return (
    <>
      {GROUPS.filter((g) => !only || only.includes(g.key)).map((g) => {
        const items = perks.filter((p) => p.category === g.key);
        if (!items.length) return null;
        return (
          <section key={g.key}>
            <SectionTitle title={g.title} hint={g.hint} />
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((p) => (
                <PerkCard key={p.id} perk={p} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
