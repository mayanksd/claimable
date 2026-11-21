"use client";

import { useId, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type TabDef = {
  id: string;
  label: string;
  /** Under 640px the tabs sit in a 2×2 grid with these short labels. */
  shortLabel?: string;
  badge?: React.ReactNode;
  star?: boolean;
};

/**
 * Chunky pill tabs: one row of full labels on desktop, a 2×2 grid of short labels on phones. The `star` tab (Perks) always wears the hero gradient with a soft glow and a
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
    <div role="tablist" className="mt-7 mb-5 grid grid-cols-2 gap-2 py-1.5 sm:flex sm:flex-wrap">
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
              "relative flex min-h-12 min-w-0 shrink-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-full px-3 text-[15px] font-bold whitespace-nowrap transition-all duration-200 sm:justify-start sm:gap-2 sm:px-5 sm:text-base",
              // Only the selected tab is ever filled.
              t.star && selected && "bg-gradient-to-r from-brand via-brand-2 to-warm text-white shadow-lg shadow-warm/30 ring-2 ring-brand/30 ring-offset-2 ring-offset-background",
              t.star && !selected && "star-outline hover:shadow-sm",
              !t.star && selected && "border border-brand bg-brand text-white shadow-md shadow-brand/25",
              !t.star && !selected && "border border-border bg-white text-foreground hover:border-brand-line hover:bg-brand-soft",
            )}
          >
            {t.shortLabel ? (
              <>
                <span className="sm:hidden">
                  <Label text={t.shortLabel} gradient={!!t.star && !selected} />
                </span>
                <span className="hidden sm:inline">
                  <Label text={t.label} gradient={!!t.star && !selected} />
                </span>
              </>
            ) : (
              <Label text={t.label} gradient={!!t.star && !selected} />
            )}
            {t.star ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  selected ? "bg-white/25 text-white" : "bg-brand-soft text-brand",
                )}
              >
                {t.badge}
              </span>
            ) : (
              t.badge
            )}
            {t.star && selected && !reduce && (
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

/** Tab text; for the unselected star tab the words get gradient ink, the emoji keeps its colours. */
function Label({ text, gradient }: { text: string; gradient: boolean }) {
  if (!gradient) return <>{text}</>;
  const m = text.match(/^(.*?)(\s*\p{Extended_Pictographic}.*)?$/u);
  const words = m?.[1] ?? text;
  const emoji = m?.[2] ?? "";
  return (
    <>
      <span className="bg-gradient-to-r from-brand via-brand-2 to-warm bg-clip-text text-transparent">{words}</span>
      {emoji}
    </>
  );
}
