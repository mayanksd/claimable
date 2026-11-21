import type { Extraction } from "@/lib/schema";
import { PerkCard } from "./PerkCard";
import { SectionTitle } from "./SectionTitle";

/** Add-on covers that only apply if bought. */
export function OptionalCovers({ covers }: { covers: Extraction["optionalCovers"] }) {
  if (!covers.length) return null;
  return (
    <section>
      <SectionTitle title="Optional covers" hint="only if you bought them" />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {covers.map((c) => (
          <PerkCard key={c.id} perk={c} optional />
        ))}
      </div>
    </section>
  );
}
