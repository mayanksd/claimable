"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AGE_BANDS, type AgeBand, type Gender, type Profile } from "@/lib/profile";
import { FOCUS, type About, type FocusId } from "@/lib/agent/types";
import { cn } from "@/lib/utils";

const BODY: { id: Gender; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "unspecified", label: "Prefer not to say" },
];
const MAX_FOCUS = 2;

type Props = { profile: Profile | null | undefined; initial?: About | null; onBack: () => void; onRun: (a: About, fromPolicy: boolean) => void };

/** Step "About you": age + body pre-filled from the policy (change if you like), then up to 2 focus areas. */
export function AboutYou({ profile, initial, onBack, onRun }: Props) {
  const known = !!profile?.ageBand;
  const [ageBand, setAgeBand] = useState<AgeBand | null>(initial?.ageBand ?? profile?.ageBand ?? null);
  const [gender, setGender] = useState<Gender>(initial?.gender ?? profile?.gender ?? "unspecified");
  const [editing, setEditing] = useState(!known);
  const [focus, setFocus] = useState<FocusId[]>(initial?.focus ?? []);
  const changed = ageBand !== (profile?.ageBand ?? null) || gender !== (profile?.gender ?? "unspecified");

  const toggle = (id: FocusId) =>
    setFocus((f) => (f.includes(id) ? f.filter((x) => x !== id) : f.length >= MAX_FOCUS ? f : [...f, id]));

  const bodyLabel = BODY.find((b) => b.id === gender)!.label;
  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pt-8 pb-16">
      <BackLink onClick={onBack} />
      <p className="mt-4 text-sm font-semibold text-brand">🧬 Max my free check-up</p>
      <h1 className="mt-1 text-[30px] leading-tight font-extrabold tracking-tight sm:text-[36px]">About you</h1>
      <p className="mt-1 text-base text-muted-foreground">Two quick taps so the plan fits you.</p>

      <section className="mt-5 rounded-3xl border bg-white p-5 shadow-soft sm:p-6">
        <h2 className="text-sm font-bold tracking-wide text-muted-foreground uppercase">You</h2>
        {!editing ? (
          <p className="mt-2 text-lg font-semibold">
            Age {profile?.age ?? AGE_BANDS.find((b) => b.id === ageBand)?.label} · {bodyLabel}{" "}
            <span className="text-sm font-medium text-muted-foreground">(from your policy)</span> ·{" "}
            <button type="button" onClick={() => setEditing(true)} className="min-h-11 cursor-pointer px-1 text-base font-semibold text-brand hover:underline">
              change
            </button>
          </p>
        ) : (
          <div className="mt-2 grid gap-4">
            {!known && <p className="text-sm text-muted-foreground">We couldn&apos;t read your age from the policy — pick one.</p>}
            <ChipRow label="Age" options={AGE_BANDS.map((b) => ({ id: b.id, label: b.label }))} value={ageBand} onPick={(v) => setAgeBand(v as AgeBand)} />
            <ChipRow label="Body" options={BODY} value={gender} onPick={(v) => setGender(v as Gender)} />
          </div>
        )}
      </section>

      <section className="mt-4 rounded-3xl border bg-white p-5 shadow-soft sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold tracking-wide text-muted-foreground uppercase">Focus</h2>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            Pick up to {MAX_FOCUS} · {focus.length} chosen
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {FOCUS.map((f) => {
            const on = focus.includes(f.id);
            const full = !on && focus.length >= MAX_FOCUS;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                disabled={full}
                onClick={() => toggle(f.id)}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-2 rounded-2xl border-2 px-3 py-2 text-left text-sm font-bold transition-all",
                  on ? "border-brand bg-brand-soft text-brand" : "border-border bg-white hover:border-brand-line",
                  full && "cursor-not-allowed opacity-45",
                )}
              >
                <span aria-hidden className="text-xl">
                  {f.emoji}
                </span>
                {f.label}
              </button>
            );
          })}
        </div>
      </section>

      <Button
        variant="hero"
        size="lg"
        className="mt-6 h-14 w-full rounded-2xl text-lg"
        disabled={!ageBand}
        onClick={() => onRun({ ageBand, age: known && !changed ? (profile?.age ?? null) : null, gender, focus }, known && !changed)}
      >
        Build my check-up plan ✨
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        🔒 Worked out on this device. Your date of birth is never sent anywhere; only package names are searched online.
      </p>
    </div>
  );
}

export function BackLink({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg pr-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> {label}
    </button>
  );
}

function ChipRow({ label, options, value, onPick }: { label: string; options: { id: string; label: string }[]; value: string | null; onPick: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="w-12 text-sm font-semibold text-muted-foreground">{label}</span>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onPick(o.id)}
          className={cn(
            "min-h-10 cursor-pointer rounded-full border px-3.5 text-sm font-semibold transition-colors max-sm:min-h-11",
            value === o.id ? "border-brand bg-brand text-white" : "bg-white hover:border-brand-line hover:bg-brand-soft",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
