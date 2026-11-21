import { inr } from "@/lib/format";

export function ClaimedProgress({ claimed, total }: { claimed: number; total: number }) {
  if (total <= 0) return null;
  const pct = Math.min(100, (claimed / total) * 100);
  return (
    <div className="mb-1 rounded-xl border bg-white px-4 py-3" aria-live="polite">
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        {claimed > 0 ? (
          <b>
            {inr(claimed)} <span className="font-medium text-muted-foreground">of {inr(total)} claimed</span>
          </b>
        ) : (
          <span className="font-medium text-muted-foreground">
            Used a perk? Tap <b className="text-foreground">Mark claimed</b> and watch this fill up 💪
          </span>
        )}
        {claimed >= total && <span className="text-sm font-semibold text-good">All claimed 🎉</span>}
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
        <i className="block h-full rounded-full bg-good transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
