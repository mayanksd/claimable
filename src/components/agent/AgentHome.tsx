"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { inr } from "@/lib/format";

type Props = {
  /** The check-up limit in the loaded policy; null if it has none. */
  limitInr: number | null;
  reimbursement: boolean;
  sample: boolean;
  onMax: () => void;
  onDashboard: () => void;
  onChat: () => void;
  onOwnPolicy: () => void;
};

/** Landing: the check-up agent first, the full dashboard and chat right below. */
export function AgentHome({ limitInr, reimbursement, sample, onMax, onDashboard, onChat, onOwnPolicy }: Props) {
  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pt-10 pb-16 text-center sm:pt-14">
      <p className="text-sm font-semibold tracking-wide text-brand">🩺 Health insurance perk finder</p>
      <h1 className="mt-2 text-[34px] leading-[1.08] font-extrabold tracking-tight sm:text-[46px]">
        Your health insurance has perks.
        <br />
        <span className="bg-gradient-to-r from-warm to-warm-2 bg-clip-text text-transparent">Start using them.</span>
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">Discover the perks you&apos;re already paying for.</p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span className="rounded-full bg-white px-3 py-1 font-semibold shadow-sm ring-1 ring-border">
          {sample ? "📄 Using the sample policy (fictional Aarogya)" : "📄 Using your policy"}
        </span>
        <button type="button" onClick={onOwnPolicy} className="min-h-11 cursor-pointer rounded-lg px-2 font-semibold text-brand hover:underline">
          {sample ? "Use my own policy" : "Use another policy"}
        </button>
      </div>

      {limitInr ? (
        <motion.button
          type="button"
          onClick={onMax}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          className="group relative mt-5 block w-full cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-warm to-warm-2 p-6 text-left text-white shadow-xl shadow-warm/30 outline-none focus-visible:ring-4 focus-visible:ring-warm/40 sm:p-8"
        >
          <span aria-hidden className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-white/15 blur-2xl" />
          <span className="flex items-center justify-between gap-3">
            <span className="font-display text-[26px] leading-tight font-extrabold sm:text-[32px]">
              🧬 Max my free {inr(limitInr)} check-up
            </span>
            <ArrowRight className="size-7 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" strokeWidth={2.5} />
          </span>
          <span className="mt-2 block text-base font-semibold text-white/95 sm:text-lg">
            Already covered by your policy{reimbursement ? ` · 100% reimbursable up to ${inr(limitInr)}` : ` · up to ${inr(limitInr)}`}
          </span>
          {reimbursement && <span className="mt-1 block text-sm text-white/85">Pay at the lab, claim it back. Keep your bills.</span>}
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-wide uppercase">
            7-step agent · about a minute
          </span>
        </motion.button>
      ) : (
        <div className="mt-5 rounded-3xl border bg-white p-6 text-left shadow-soft">
          <p className="font-display text-xl font-bold">No free check-up found in this policy</p>
          <p className="mt-1 text-sm text-muted-foreground">Your other perks are still waiting on the dashboard.</p>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SecondaryCard emoji="📊" label="See my full policy dashboard" onClick={onDashboard} />
        <SecondaryCard emoji="💬" label="Talk to my policy" onClick={onChat} />
      </div>

      <p className="mx-auto mt-6 max-w-[520px] text-xs text-muted-foreground italic">
        🔒 We mask your name, PAN, phone, email, address, date of birth and policy number before AI reads anything. No medical
        advice, no policy selling.
      </p>
    </div>
  );
}

function SecondaryCard({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left text-base font-bold shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand-line hover:bg-brand-soft motion-reduce:transform-none"
    >
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-xl">
        {emoji}
      </span>
      <span className="flex-1">{label}</span>
      <ArrowRight className="size-4 text-brand" />
    </button>
  );
}
