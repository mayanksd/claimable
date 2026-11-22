"use client";

import { ArrowRight, CalendarPlus, ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Extraction } from "@/lib/schema";
import type { CheckedProvider, CheckupRules, Plan } from "@/lib/agent/types";
import { asOfLabel } from "@/lib/agent/steps";
import { TAG_LABEL } from "@/lib/agent/plan";
import { reminderDate, reminderIcs } from "@/lib/agent/pack";
import { MORE_LABS } from "@/data/providers";
import { formatDay, nextPolicyYearStart } from "@/lib/policyDates";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PackData = { plan: Plan; rules: CheckupRules; genetic: CheckedProvider[]; checklist: string[]; alternatives: CheckedProvider[] };

export function PlanOutput({ data, extraction, onExplore }: { data: PackData; extraction: Extraction; onExplore: () => void }) {
  const { plan, rules, genetic, checklist, alternatives } = data;
  const pct = rules.limitInr ? Math.min(100, (plan.totalInr / rules.limitInr) * 100) : 0;
  const reset = extraction.checkupFrequency?.everyYear !== false ? nextPolicyYearStart(extraction.policy.startDate, new Date()) : null;

  function addReminder() {
    const date = reminderDate(reset, new Date());
    const ics = reminderIcs({
      date,
      now: new Date(),
      title: `Use your free ${inr(rules.limitInr)} health check-up`,
      description: [
        reset ? `Your check-up benefit resets on ${formatDay(reset)}.` : "Book your free check-up.",
        ...plan.items.map((p) => `${p.name} ${p.product}: ${p.bookingUrl}`),
        "Keep the bill and reports, then claim.",
      ].join("\n"),
    });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "claimable-checkup-reminder.ics" });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="mt-8 grid gap-5">
      <section className="rounded-3xl border bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-extrabold">Your plan</h2>
          <span className="text-base font-bold">
            {inr(plan.totalInr)} <span className="font-medium text-muted-foreground">of {inr(rules.limitInr)} used</span>
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary" role="meter" aria-valuemin={0} aria-valuemax={rules.limitInr} aria-valuenow={plan.totalInr} aria-label="Check-up limit used">
          <div className="h-full rounded-full bg-gradient-to-r from-warm to-warm-2" style={{ width: `${pct}%` }} />
        </div>
        {plan.items.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">Nothing in our list fits this limit. Try the labs below — most have routine packages.</p>
        )}
        <div className="mt-4 grid gap-3">
          {plan.items.map((p, i) => (
            <ProviderCard key={p.id} p={p} hero={p.category === "hero"} overlap={i > 0 ? plan.items.slice(0, i) : []} />
          ))}
        </div>
      </section>

      {genetic.map((g) => (
        <section key={g.id} className="rounded-3xl border border-warn-line bg-warn-soft p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-extrabold">🧬 DNA option</h2>
            <Badge variant={g.coverage === "prescription" ? "default" : "secondary"}>{g.coverage === "prescription" ? "Covered only with prescription" : "Ask your insurer"}</Badge>
          </div>
          <p className="mt-2 text-base font-semibold">
            Covered only if a doctor prescribes it for a medical reason — get a prescription, then claim. Wellness DNA tests without a
            prescription are usually not covered.
          </p>
          <ProviderCard p={g} hero={false} overlap={[]} plain />
          <p className="mt-2 text-xs text-muted-foreground">Not counted in your {inr(rules.limitInr)} plan above.</p>
        </section>
      ))}

      <section className="rounded-3xl border bg-white p-5 shadow-soft sm:p-6">
        <h2 className="font-display text-xl font-extrabold">🧾 Claim checklist</h2>
        <ul className="mt-3 grid gap-2">
          {checklist.map((c) => (
            <li key={c} className="flex gap-2.5 text-base">
              <span aria-hidden className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 border-brand-line" />
              {c}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={addReminder}>
            <CalendarPlus /> Add reminder
          </Button>
          <span className="text-sm text-muted-foreground">
            {reset ? `Your check-up resets on ${formatDay(reset)} — we'll remind you a month before.` : "We'll remind you in two weeks."}
          </span>
        </div>
      </section>

      {(alternatives.length > 0 || MORE_LABS.length > 0) && (
        <details className="group rounded-3xl border bg-white p-5 shadow-soft sm:p-6">
          <summary className="cursor-pointer list-none font-display text-lg font-extrabold">
            More options to compare <span className="text-sm font-medium text-muted-foreground group-open:hidden">· tap to open</span>
          </summary>
          {alternatives.length > 0 && (
            <ul className="mt-3 grid gap-1.5 text-sm">
              {alternatives.map((p) => (
                <li key={p.id} className="flex flex-wrap justify-between gap-2">
                  <a href={p.bookingUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
                    {p.name} {p.product}
                  </a>
                  <span className="text-muted-foreground">
                    {inr(p.priceInr)} · {sourceLabel(p)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm font-semibold text-muted-foreground">Bengaluru labs to compare (prices on their sites)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MORE_LABS.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-sm font-semibold hover:bg-brand-soft max-sm:min-h-11">
                {l.name} <ExternalLink className="size-3.5" />
              </a>
            ))}
          </div>
        </details>
      )}

      <p className="text-center text-sm text-muted-foreground">Prices change — confirm on the provider&apos;s site. Ask your doctor which tests suit you.</p>

      <Button variant="hero" size="lg" className="h-14 justify-self-center rounded-2xl px-8 text-lg" onClick={onExplore}>
        Explore all your perks <ArrowRight className="size-5" />
      </Button>
    </div>
  );
}

const sourceLabel = (p: CheckedProvider) => (p.priceSource === "live" ? "live" : `listed ${asOfLabel(p.asOf)}`);

function ProviderCard({ p, hero, overlap, plain }: { p: CheckedProvider; hero: boolean; overlap: CheckedProvider[]; plain?: boolean }) {
  const shared = overlap.length ? p.tags.filter((t) => overlap.some((o) => o.tags.includes(t))).map((t) => TAG_LABEL[t] ?? t) : [];
  return (
    <div className={cn("rounded-2xl border p-4", plain ? "mt-3 bg-white" : hero ? "border-warm-line bg-warm-soft/60" : "bg-white")}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          {hero && <p className="text-xs font-bold tracking-wide text-warm uppercase">⭐ Premium screening</p>}
          <h3 className="text-lg font-extrabold">
            {p.name} · {p.product}
          </h3>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-extrabold">{inr(p.priceInr)}</div>
          {p.listPriceInr && p.listPriceInr > p.priceInr && <div className="text-xs text-muted-foreground line-through">{inr(p.listPriceInr)}</div>}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{p.covers}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" /> {p.location}
        </span>
        <span className={cn("rounded-full px-2 py-0.5", p.priceSource === "live" ? "bg-good-soft text-good-ink" : "bg-secondary")}>
          {p.priceSource === "live" ? "● live price" : `listed ${asOfLabel(p.asOf)}`}
        </span>
        {p.coverage === "covered" && <span className="rounded-full bg-good-soft px-2 py-0.5 text-good-ink">✓ Covered</span>}
        {p.note && <span className="text-warn">⚠ {p.note}</span>}
      </div>
      {shared.length > 0 && <p className="mt-1.5 text-xs text-muted-foreground">Some overlap with your other package: {shared.slice(0, 4).join(", ")}.</p>}
      <Button asChild variant={hero ? "hero" : "brand"} className="mt-3 w-full sm:w-auto">
        <a href={p.liveUrl ?? p.bookingUrl} target="_blank" rel="noopener noreferrer">
          Book now <ArrowRight className="size-4" />
          <span className="sr-only"> (opens {p.name} in a new tab)</span>
        </a>
      </Button>
    </div>
  );
}
