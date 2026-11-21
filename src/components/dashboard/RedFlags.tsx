import type { Extraction } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./SectionTitle";

export function RedFlags({ flags }: { flags: Extraction["redFlags"] }) {
  if (!flags.length) return null;
  const ordered = [...flags].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
  return (
    <section>
      <SectionTitle title="Red flags" hint="rare, but they hurt at claim time" />
      <div className="grid gap-2.5">
        {ordered.map((f) => (
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
              <span className="text-[13px] text-muted-foreground">
                {f.why} (p.{f.sourcePage})
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
