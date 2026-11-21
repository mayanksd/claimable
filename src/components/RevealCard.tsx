"use client";

import { useEffect, useRef } from "react";
import { useIsPresent } from "framer-motion";
import { inr } from "@/lib/format";
import { useCountUp } from "@/lib/client/useCountUp";
import { burstConfetti } from "@/lib/client/confetti";

/** The "you just won" beat between loading and the dashboard (~1.5 s). Not shown with reduced motion. */
export function RevealCard({ total, onDone, ms = 1500 }: { total: number; onDone: () => void; ms?: number }) {
  const shown = useCountUp(total, 1100);
  // While fading out (e.g. the upload turned out not to be a health policy), never start the confetti.
  const present = useRef(true);
  present.current = useIsPresent();
  useEffect(() => {
    const c = setTimeout(() => {
      if (present.current) void burstConfetti({ x: 0.5, y: 0.45 });
    }, 250);
    const t = setTimeout(onDone, ms);
    return () => {
      clearTimeout(c);
      clearTimeout(t);
    };
  }, [onDone, ms]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[640px] items-center px-5">
      <div
        className="w-full rounded-3xl p-8 text-center text-white shadow-2xl shadow-brand/30 sm:p-12"
        style={{ background: "radial-gradient(130% 150% at 0% 0%, #4f46e5 0%, #7c3aed 50%, #e2557a 85%, #ff7a59 100%)" }}
        role="status"
        aria-live="polite"
      >
        <h2 className="text-[28px] leading-tight font-extrabold sm:text-[34px]">We found something good! 🎉</h2>
        <div className="font-display mt-4 text-[48px] leading-none font-extrabold tabular-nums sm:text-[64px]" aria-label={inr(total)}>
          {inr(shown)}
        </div>
        <p className="mt-2 text-xl font-semibold opacity-90">of perks in your policy this year</p>
      </div>
    </div>
  );
}
