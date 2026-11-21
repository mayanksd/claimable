"use client";

import { useId, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type TabDef = { id: string; label: string; badge?: React.ReactNode };

/** Accessible tab bar (arrow keys move between tabs). Scrolls sideways on small screens. */
export function Tabs({ tabs, active, onChange }: { tabs: TabDef[]; active: string; onChange: (id: string) => void }) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (i: number) => {
    const t = tabs[(i + tabs.length) % tabs.length];
    onChange(t.id);
    refs.current[(i + tabs.length) % tabs.length]?.focus();
  };
  return (
    <div role="tablist" className="-mx-4 mt-7 mb-5 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          id={`${base}-${t.id}`}
          role="tab"
          type="button"
          aria-selected={active === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={active === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") move(i + 1);
            if (e.key === "ArrowLeft") move(i - 1);
          }}
          className={cn(
            "relative flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 px-3.5 pt-2 pb-3 text-base font-semibold whitespace-nowrap transition-colors",
            active === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {t.badge}
          {active === t.id && (
            <motion.span
              layoutId={`${base}-underline`}
              className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-gradient-to-r from-warm to-warm-2"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
