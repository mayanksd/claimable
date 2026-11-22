"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import type { Extraction } from "@/lib/schema";
import type { About } from "@/lib/agent/types";
import {
  STEPS,
  lookupIds,
  stepCheck,
  stepFit,
  stepPack,
  stepPrices,
  stepRead,
  stepShortlist,
  stepYou,
  type StepId,
  type StepResult,
} from "@/lib/agent/steps";
import type { LivePrice } from "@/lib/agent/prices";
import { cn } from "@/lib/utils";
import { BackLink } from "./AboutYou";
import { PlanOutput, type PackData } from "./PlanOutput";

type StepState = { status: "todo" | "run" | "done"; ms?: number; result?: StepResult };

type Props = {
  extraction: Extraction;
  policyText: string;
  about: About;
  fromPolicy: boolean;
  demo: boolean;
  onBack: () => void;
  onExplore: () => void;
};

const PRICE_TIMEOUT_MS = 22_000;

async function fetchPrices(ids: string[], demo: boolean): Promise<{ prices: LivePrice[]; lookups: number; note?: string }> {
  try {
    const res = await fetch(`/api/prices${demo ? "?demo=1" : ""}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids }),
      signal: AbortSignal.timeout(PRICE_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(String(res.status));
    const j = (await res.json()) as { prices?: LivePrice[]; lookups?: number; note?: string };
    return { prices: j.prices ?? [], lookups: j.lookups ?? 0, note: j.note };
  } catch {
    return { prices: [], lookups: 0, note: "Live search is unavailable — showing listed prices." };
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The 7 visible agent steps, then the plan. Each step shows ✓, how long it took, and an expandable "why". */
export function AgentRun({ extraction, policyText, about, fromPolicy, demo, onBack, onExplore }: Props) {
  const reduce = useReducedMotion();
  const [steps, setSteps] = useState<Record<StepId, StepState>>(
    () => Object.fromEntries(STEPS.map((s) => [s.id, { status: "todo" }])) as Record<StepId, StepState>,
  );
  const [pack, setPack] = useState<PackData | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;
    // Code steps are instant; a short minimum keeps each one readable as it ticks.
    const minMs = reduce ? 120 : 650;
    async function step<T>(id: StepId, work: () => Promise<{ value: T; result: StepResult }> | { value: T; result: StepResult }): Promise<T> {
      const t0 = performance.now();
      setSteps((s) => ({ ...s, [id]: { status: "run" } }));
      const [out] = await Promise.all([Promise.resolve(work()), wait(minMs)]);
      if (cancelled) throw new Error("cancelled");
      setSteps((s) => ({ ...s, [id]: { status: "done", ms: performance.now() - t0, result: out.result } }));
      return out.value;
    }
    (async () => {
      const rules = await step("read", () => {
        const r = stepRead(extraction, policyText);
        return { value: r.rules, result: r.result };
      });
      await step("you", () => ({ value: null, result: stepYou(about, fromPolicy) }));
      const sl = await step("shortlist", () => {
        const s = stepShortlist(about);
        return { value: s, result: s.result };
      });
      const priced = await step("prices", async () => {
        const live = await fetchPrices(lookupIds(sl.shortlist), demo);
        const p = stepPrices(sl.candidates, live.prices, live.lookups, live.note);
        return { value: p.priced, result: p.result };
      });
      const checked = await step("check", () => {
        const c = stepCheck(priced, rules);
        return { value: c.checked, result: c.result };
      });
      const plan = await step("fit", () => {
        const f = stepFit(checked, rules, about);
        return { value: f.plan, result: f.result };
      });
      const p = await step("pack", () => {
        const k = stepPack(plan, checked, rules);
        return { value: k, result: k.result };
      });
      if (!cancelled) {
        await wait(reduce ? 0 : 350);
        setPack({
          plan,
          rules,
          genetic: p.genetic,
          checklist: p.checklist,
          ageGroup: sl.ageGroup.map((a) => ({ ...a, checked: checked.find((c) => c.id === a.test.id) ?? null })),
          about,
          alternatives: checked.filter((c) => c.coverage === "covered" && !plan.items.includes(c) && c.category !== "genetic" && c.category !== "test"),
        });
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
      started.current = false;
    };
  }, [extraction, policyText, about, fromPolicy, demo, reduce]);

  const doneCount = STEPS.filter((s) => steps[s.id].status === "done").length;
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pt-8 pb-16">
      <BackLink onClick={onBack} label="Change my answers" />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-brand">🧬 Max my free check-up</p>
          <h1 className="text-[28px] leading-tight font-extrabold tracking-tight sm:text-[34px]">
            {pack ? "Your check-up plan is ready 🎉" : "Building your plan…"}
          </h1>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-muted-foreground ring-1 ring-border" aria-live="polite">
          {doneCount} of {STEPS.length} steps
        </span>
      </div>

      <ol className="mt-4 grid gap-2.5" aria-label="Agent steps">
        {STEPS.map((s, i) => (
          <StepRow key={s.id} n={i + 1} emoji={s.emoji} title={s.id === "fit" && pack ? `Fit the best plan to ${inrPlain(pack.rules.limitInr)}` : s.title} working={s.working} state={steps[s.id]} />
        ))}
      </ol>

      <AnimatePresence>
        {pack && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <PlanOutput data={pack} extraction={extraction} onExplore={onExplore} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const inrPlain = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const secs = (ms: number) => (ms < 100 ? "<0.1s" : `${(ms / 1000).toFixed(1)}s`);

function StepRow({ n, emoji, title, working, state }: { n: number; emoji: string; title: string; working: string; state: StepState }) {
  const [open, setOpen] = useState(false);
  const done = state.status === "done";
  return (
    <motion.li
      layout="position"
      initial={false}
      animate={{ opacity: state.status === "todo" ? 0.5 : 1 }}
      className={cn(
        "rounded-2xl border bg-white px-4 py-3 shadow-sm transition-colors",
        state.status === "run" && "border-brand-line ring-2 ring-brand/15",
        done && "border-good-line/70",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
            done ? "bg-good text-white" : state.status === "run" ? "bg-brand text-white" : "bg-secondary text-muted-foreground",
          )}
          aria-hidden
        >
          {done ? (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
              <Check className="size-4" strokeWidth={3} />
            </motion.span>
          ) : state.status === "run" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            n
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h3 className="text-base font-bold">
              <span aria-hidden>{emoji}</span> {title}
              <span className="sr-only">{done ? " — done" : state.status === "run" ? " — working" : " — waiting"}</span>
            </h3>
            {done && state.ms !== undefined && <span className="text-xs font-semibold text-muted-foreground tabular-nums">✓ {secs(state.ms)}</span>}
          </div>
          {state.status === "run" && <p className="mt-0.5 text-sm text-muted-foreground">{working}</p>}
          {done && state.result && (
            <>
              <p className="mt-0.5 text-sm font-semibold text-good-ink">{state.result.summary}</p>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="mt-1 inline-flex min-h-8 cursor-pointer items-center gap-1 text-xs font-bold text-brand hover:underline max-sm:min-h-11"
              >
                Why? <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-1 grid list-disc gap-1 overflow-hidden pl-5 text-sm text-muted-foreground"
                  >
                    {state.result.why.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </motion.li>
  );
}
