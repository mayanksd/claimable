import type { Extraction } from "@/lib/schema";
import { cn } from "@/lib/utils";

type Flag = Extraction["redFlags"][number];

/** Claim-time surprises, most serious first. A less-than-yearly check-up is added as a flag. */
export function watchOutFlags(e: Pick<Extraction, "redFlags" | "checkupFrequency">): Flag[] {
  const flags = [...e.redFlags];
  const f = e.checkupFrequency;
  if (f && !f.everyYear && !flags.some((x) => /check-?\s?up/i.test(x.title))) {
    flags.push({
      id: "checkup-frequency",
      emoji: "🩺",
      title: `Free check-up only ${f.label.charAt(0).toLowerCase()}${f.label.slice(1)}`,
      why: "Not every year, so plan when you use it.",
      severity: "medium",
      sourcePage: f.sourcePage,
    });
  }
  return flags.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
}

export function WatchOut({ flags }: { flags: Flag[] }) {
  if (!flags.length) {
    return (
      <div className="rounded-2xl border border-dashed bg-white px-5 py-8 text-center text-sm text-muted-foreground">
        We didn&apos;t find any claim-time surprises in your policy. Still unsure about a rule? Ask your insurer.
      </div>
    );
  }
  return (
    <div className="grid gap-2.5">
      <p className="text-sm text-muted-foreground">Rare, but they hurt at claim time.</p>
      {flags.map((f) => (
        <div
          key={f.id}
          className={cn(
            "flex items-start gap-3 rounded-[10px] border-l-4 px-3.5 py-2.5",
            f.severity === "high" ? "border-bad bg-bad-soft" : "border-warn bg-warn-soft",
          )}
        >
          <span aria-hidden>{f.emoji}</span>
          <div>
            <b className="block">{f.title}</b>
            <span className="text-sm text-muted-foreground">
              {f.why} (p.{f.sourcePage})
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
