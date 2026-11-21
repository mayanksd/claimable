"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BASE_PACKAGE } from "@/data/test-prices";
import { checkupSuggestions, defaultPlan, planTotal } from "@/lib/checkupPlan";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Builds a check-up plan up to the policy's limit. Prices are approximate; no medical advice. */
export function CheckupPlanner({ limitInr, policyText, onClose }: { limitInr: number; policyText: string; onClose: () => void }) {
  const { source, addOns } = useMemo(() => checkupSuggestions(policyText), [policyText]);
  const [picked, setPicked] = useState(() => defaultPlan(addOns, limitInr));
  const total = planTotal(addOns, picked);
  const left = limitInr - total;
  const pct = Math.min(100, (total / limitInr) * 100);

  const toggle = (id: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Card className="col-span-full border-brand-line" role="region" aria-label="Max your check-up">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold">Max your check-up</h3>
          <p className="text-[13px] text-muted-foreground">
            {source === "policy" ? "From your policy's test list" : "Common add-ons — confirm with your insurer"}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close planner" className="rounded p-1 text-muted-foreground hover:bg-secondary">
          <X className="size-4" />
        </button>
      </div>

      <div className="mb-1 flex items-baseline justify-between text-sm">
        <b>
          {inr(total)} <span className="font-medium text-muted-foreground">of {inr(limitInr)}</span>
        </b>
        <span className={cn("text-[13px] font-semibold", left < 0 ? "text-bad" : "text-good")}>
          {left < 0 ? `${inr(-left)} over` : left === 0 ? "All used 🎉" : `${inr(left)} left`}
        </span>
      </div>
      <div className="mb-4 h-3 overflow-hidden rounded-full bg-secondary" aria-hidden>
        <i
          className={cn("block h-full rounded-full transition-all", left < 0 ? "bg-bad" : "bg-gradient-to-r from-good to-brand")}
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        <Row name={BASE_PACKAGE.name} includes={BASE_PACKAGE.includes} price={BASE_PACKAGE.priceInr} checked locked />
        {addOns.map((t) => {
          const on = picked.has(t.id);
          return (
            <Row
              key={t.id}
              name={t.name}
              includes={t.includes}
              price={t.priceInr}
              checked={on}
              disabled={!on && t.priceInr > left}
              onToggle={() => toggle(t.id)}
            />
          );
        })}
      </ul>
      {source === "policy" && addOns.length === 0 && (
        <p className="mt-2 text-[13px] text-muted-foreground">None of the common add-ons appear in your policy&apos;s list; ask your insurer what&apos;s included.</p>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">Prices are approximate. Ask your doctor which tests suit you.</p>
    </Card>
  );
}

function Row(props: {
  name: string;
  includes: string;
  price: number;
  checked: boolean;
  locked?: boolean;
  disabled?: boolean;
  onToggle?: () => void;
}) {
  const { name, includes, price, checked, locked, disabled, onToggle } = props;
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={locked || disabled}
        onClick={onToggle}
        title={disabled ? "Doesn't fit in what's left" : undefined}
        className={cn(
          "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13px] transition-colors",
          checked ? "border-good-line bg-good-soft" : "bg-white hover:bg-secondary",
          locked ? "cursor-default" : "cursor-pointer",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span
          className={cn(
            "mt-0.5 grid size-4 shrink-0 place-items-center rounded border",
            checked ? "border-good bg-good text-white" : "border-muted-foreground/40",
          )}
        >
          {checked && <Check className="size-3" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block">
            {name}
            {locked && <span className="ml-1 font-medium text-muted-foreground">· base</span>}
          </b>
          <span className="text-muted-foreground">{includes}</span>
        </span>
        <span className="shrink-0 font-semibold whitespace-nowrap">~{inr(price)}</span>
      </button>
    </li>
  );
}
