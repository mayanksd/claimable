"use client";

import { useId, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type TabDef = { id: string; label: string; badge?: React.ReactNode; star?: boolean };

/**
 * Chunky pill tabs (wrap onto two rows on phones so Perks never scrolls out of view). The `star` tab (Perks) always wears the hero gradient with a soft glow and a
 * one-time shine sweep; other tabs are white, and solid indigo when selected. Arrow keys move.
 */
export function Tabs({ tabs, active, onChange }: { tabs: TabDef[]; active: string; onChange: (id: string) => void }) {
  const base = useId();
  const reduce = useReducedMotion();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (i: number) => {
    const n = (i + tabs.length) % tabs.length;
    onChange(tabs[n].id);
    refs.current[n]?.focus();
  };
  return (
    <div role="tablist" className="mt-7 mb-5 flex flex-wrap gap-2 py-1.5">
      {tabs.map((t, i) => {
        const selected = active === t.id;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${base}-${t.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") move(i + 1);
              if (e.key === "ArrowLeft") move(i - 1);
            }}
            className={cn(
              "relative flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 overflow-hidden rounded-full px-3.5 text-sm font-bold whitespace-nowrap transition-all duration-200 sm:min-h-12 sm:gap-2 sm:px-5 sm:text-base",
              t.star
                ? "bg-gradient-to-r from-brand via-brand-2 to-warm text-white shadow-lg shadow-warm/30"
                : selected
                  ? "border border-brand bg-brand text-white shadow-md shadow-brand/25"
                  : "border border-border bg-white text-foreground hover:border-brand-line hover:bg-brand-soft",
              t.star && selected && "ring-2 ring-brand/30 ring-offset-2 ring-offset-background",
              t.star && !selected && "opacity-90 hover:opacity-100",
            )}
          >
            {t.label}
            {t.badge}
            {t.star && !reduce && (
              // One shine sweep on first view.
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                initial={{ left: "-60%" }}
                animate={{ left: "130%" }}
                transition={{ duration: 0.9, delay: 0.7, ease: "easeInOut" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
