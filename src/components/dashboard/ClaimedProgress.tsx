import { inr } from "@/lib/format";

/** Meter under the perk cards: how much of this year's perks you've used. */
export function ClaimedProgress({ claimed, total }: { claimed: number; total: number }) {
  if (total <= 0) return null;
  const pct = Math.min(100, (claimed / total) * 100);
  return (
    <div className="mt-5 rounded-2xl border bg-white px-4 py-3.5" aria-live="polite">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <b className="text-base">
          {inr(claimed)} <span className="font-medium text-muted-foreground">of {inr(total)} used</span>
        </b>
        <span className="text-xs text-muted-foreground">
          {claimed >= total ? "All used 🎉" : "Tap “Mark as used” on a perk"}
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-secondary"
        role="meter"
        aria-label="Perks used this year"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={claimed}
      >
        <i className="block h-full rounded-full bg-gradient-to-r from-good to-[#10b981] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
