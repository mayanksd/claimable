"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Extraction } from "@/lib/schema";
import { cn } from "@/lib/utils";

/** Claim-time surprises, collapsed by default so the top of the page stays a win. */
export function WatchOut({ flags }: { flags: Extraction["redFlags"] }) {
  const [open, setOpen] = useState(false);
  if (!flags.length) return null;
  const ordered = [...flags].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
  const high = flags.filter((f) => f.severity === "high").length;

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-warn-line bg-warn-soft px-4 py-3 text-left hover:brightness-[0.98]"
      >
        <span aria-hidden>⚠️</span>
        <span className="flex-1">
          <b className="block">Watch out ({flags.length})</b>
          <span className="text-[13px] text-muted-foreground">Rare, but they hurt at claim time</span>
        </span>
        {high > 0 && (
          <span className="rounded-full bg-bad-soft px-2 py-0.5 text-[11px] font-bold text-bad">{high} serious</span>
        )}
        <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-2.5 grid gap-2.5">
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
      )}
    </section>
  );
}
