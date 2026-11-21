"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FACT_MS, HEADLINE_MS, factAt, headlineAt } from "@/lib/loadingCopy";

/** Counts up once every `ms` while mounted. */
function useTick(ms: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return n;
}

/** Rotating headline + emoji for the progress card. Reduced motion: text swaps without fades. */
export function LoadingHeadline() {
  const n = useTick(HEADLINE_MS);
  const reduce = useReducedMotion();
  const line = headlineAt(n);
  const t = reduce ? { duration: 0 } : { duration: 0.35 };
  return (
    <div className="flex items-center gap-3.5" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`e${n}`}
          aria-hidden
          initial={reduce ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, scale: 0.6 }}
          transition={t}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-soft text-[26px] leading-none"
        >
          {line.emoji}
        </motion.span>
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        <motion.h2
          key={`h${n}`}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={t}
          className="text-xl font-bold"
        >
          {line.text}
        </motion.h2>
      </AnimatePresence>
    </div>
  );
}

/** "Did you know?" line under the progress card, every 6 s. */
export function FunFact() {
  const n = useTick(FACT_MS);
  const reduce = useReducedMotion();
  return (
    <div className="mx-auto mt-5 flex max-w-[480px] items-start gap-2.5 rounded-2xl bg-white/60 px-4 py-3 text-left text-sm backdrop-blur">
      <span aria-hidden className="text-base">💡</span>
      <div className="min-w-0">
        <b className="block text-xs text-brand">Did you know?</b>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={n}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.4 }}
            className="text-foreground"
          >
            {factAt(n)}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
