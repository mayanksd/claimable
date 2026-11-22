// The 7 visible agent steps: what each one did, in words a stranger can follow. Pure, so it's testable.
import { PROVIDERS, PRICES_AS_OF, type Provider } from "../../data/providers.ts";
import { AGE_BANDS } from "../profile.ts";
import type { Extraction } from "../schema.ts";
import { readCheckupRules, type Evidence } from "./rules.ts";
import { TAG_LABEL, checkCoverage, fitPlan, shortlist, tagWeights } from "./plan.ts";
import { applyLivePrices, type LivePrice } from "./prices.ts";
import { claimChecklist } from "./pack.ts";
import { FOCUS, type About, type CheckedProvider, type CheckupRules, type Plan } from "./types.ts";

export type StepId = "read" | "you" | "shortlist" | "prices" | "check" | "fit" | "pack";

export const STEPS: { id: StepId; emoji: string; title: string; working: string }[] = [
  { id: "read", emoji: "📄", title: "Read your policy", working: "Reading the check-up rules in your policy…" },
  { id: "you", emoji: "👤", title: "Understand you", working: "Noting your age band, body and focus…" },
  { id: "shortlist", emoji: "🧪", title: "Shortlist", working: "Shortlisting screenings for your age group and focus…" },
  { id: "prices", emoji: "🔎", title: "Check live prices in Bengaluru", working: "Searching providers' sites for today's prices…" },
  { id: "check", emoji: "✅", title: "Check each test against your policy", working: "Matching each package to your policy's rules…" },
  { id: "fit", emoji: "🧮", title: "Fit the best plan", working: "Trying every combination that fits your limit…" },
  { id: "pack", emoji: "📦", title: "Build your pack", working: "Putting together bookings, claim checklist and reminder…" },
];

export type StepResult = { summary: string; why: string[] };

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const asOfLabel = (iso = PRICES_AS_OF) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
const pageRef = (ev: Evidence) => (ev.page ? ` (p.${ev.page})` : "");
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
export const providerLabel = (p: Provider) => `${p.name} ${p.product}`;

export function stepRead(e: Extraction, policyText: string): { rules: CheckupRules; result: StepResult } {
  const r = readCheckupRules(e, policyText);
  const route = { reimbursement: "pay at the lab, claim it back", cashless: "cashless (as your policy says)", ask: "claim route not stated" }[r.claimRoute];
  const summary = r.found
    ? `${inr(r.limitInr)} · ${r.frequency.toLowerCase()} · ${route}`
    : "No check-up limit found in your policy";
  const why = [
    ...r.evidence.map((ev) => `${ev.label}: “${ev.quote}”${pageRef(ev)}`),
    r.imagingAllowed === true ? "Scans and advanced screening count towards the limit." : r.imagingAllowed === false ? "Scans are excluded from the check-up." : "Your policy doesn't say whether scans count.",
    { prescription: "Genetic tests: only with a doctor's prescription for a medical reason.", covered: "Genetic tests are listed as covered.", excluded: "Genetic tests aren't covered.", silent: "Genetic tests aren't mentioned." }[r.geneticRule],
    "Read by code from your masked policy text — the limit is never guessed by AI.",
  ];
  return { rules: r, result: { summary, why } };
}

export function stepYou(about: About, fromPolicy: boolean): StepResult {
  const band = AGE_BANDS.find((b) => b.id === about.ageBand)?.label;
  const body = { male: "Male", female: "Female", unspecified: "Body not specified" }[about.gender];
  const focus = about.focus.map((f) => FOCUS.find((x) => x.id === f)!.label);
  return {
    summary: [band ? `Age ${band}` : "Age not given", body, focus.length ? list(focus) : "General check"].join(" · "),
    why: [
      fromPolicy ? "Age band and body come from your policy's member details; you can change them." : "You chose these on the previous screen.",
      "Your date of birth is never sent anywhere — only the age band is used.",
      focus.length ? `Focus areas get extra weight when packages are compared: ${list(focus)}.` : "No focus picked, so packages are compared for broad, everyday coverage.",
    ],
  };
}

export function stepShortlist(about: About) {
  const s = shortlist(about);
  const w = tagWeights(about);
  const top = Object.entries(w)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => TAG_LABEL[t] ?? t);
  const candidates = [...s.heroes, ...s.supporting, ...s.genetic];
  const result: StepResult = {
    summary: `1 premium screening + ${s.supporting.length} supporting packages${s.genetic.length ? " + 1 DNA option" : ""}`,
    why: [
      `Commonly included for your age group and focus: ${list(top)}.`,
      `Premium screenings, best match first: ${s.heroes.map(providerLabel).join(" · ")}.`,
      `Supporting packages: ${s.supporting.map(providerLabel).join(" · ")}.`,
      ...(s.genetic.length ? [`DNA option: ${s.genetic.map(providerLabel).join(" · ")} — checked separately.`] : []),
      "This is what these packages commonly include, not medical advice — ask your doctor which tests suit you.",
    ],
  };
  return { shortlist: s, candidates, result };
}

/** Which packages to look up live (max 3): the top premium screenings, then the top supporting one. */
export const lookupIds = (s: ReturnType<typeof shortlist>) => [...s.heroes.slice(0, 2), ...s.supporting.slice(0, 1)].map((p) => p.id);

export function stepPrices(candidates: Provider[], live: LivePrice[], lookups: number, note?: string) {
  const priced = applyLivePrices(candidates, live);
  const liveOnes = priced.filter((p) => p.priceSource === "live");
  const result: StepResult = {
    summary: liveOnes.length
      ? `Confirmed ${liveOnes.length} price${liveOnes.length === 1 ? "" : "s"} live · others as listed ${asOfLabel()}`
      : `Showing listed prices (${asOfLabel()})`,
    why: [
      ...(note ? [note] : []),
      ...liveOnes.map((p) => `${providerLabel(p)}: ${inr(p.priceInr)} on ${new URL(p.liveUrl!).hostname} (live).`),
      `Web lookups used: ${lookups} of 3. Only package names were searched — nothing about you or your policy.`,
      "A live price is used only if it's from the provider's own site and close to the listed price.",
    ],
  };
  return { priced, result };
}

export function stepCheck(priced: ReturnType<typeof applyLivePrices>, rules: CheckupRules) {
  const checked = priced.map((p) => checkCoverage(p, rules));
  const n = (c: string) => checked.filter((p) => p.coverage === c).length;
  const parts = [`${n("covered")} covered`];
  if (n("prescription")) parts.push(`${n("prescription")} only with prescription`);
  if (n("ask")) parts.push(`${n("ask")} ask your insurer`);
  const label = { covered: "Covered", prescription: "Covered only with prescription", ask: "Ask your insurer" };
  return {
    checked,
    result: { summary: parts.join(" · "), why: checked.map((p) => `${providerLabel(p)} → ${label[p.coverage]}: ${p.coverageWhy}`) },
  };
}

export function stepFit(checked: CheckedProvider[], rules: CheckupRules, about: About) {
  const plan = fitPlan(checked, rules.limitInr, about);
  const pool = checked.filter((p) => p.coverage === "covered" && p.category !== "genetic");
  const tooDear = pool.filter((p) => p.priceInr > rules.limitInr);
  const why = [
    `Tried every combination of the ${pool.length} covered packages: at most one premium screening, never over ${inr(rules.limitInr)}.`,
    "A test two packages both include is only counted once, so you don't pay twice for the same thing.",
    ...plan.items.map((p) => `Picked ${providerLabel(p)} — ${inr(p.priceInr)}.`),
    ...(plan.duplicateTags.length ? [`Small overlap kept: ${list(plan.duplicateTags.map((t) => TAG_LABEL[t] ?? t))} — the rest is new.`] : []),
    ...tooDear.map((p) => `Skipped ${providerLabel(p)}: ${inr(p.priceInr)} is over your limit.`),
    rules.limitInr - plan.totalInr > 0 && plan.items.length
      ? `${inr(rules.limitInr - plan.totalInr)} left — nothing else fits without repeating tests or going over.`
      : "",
    "Worked out in code, not by AI.",
  ].filter(Boolean);
  return {
    plan,
    result: { summary: plan.items.length ? `${inr(plan.totalInr)} of ${inr(rules.limitInr)} used` : "Nothing fits your limit yet", why },
  };
}

export function stepPack(plan: Plan, checked: CheckedProvider[], rules: CheckupRules) {
  const genetic = checked.filter((p) => p.category === "genetic");
  const checklist = claimChecklist(rules, genetic.some((g) => g.coverage === "prescription"));
  const parts = [`${plan.items.length} booking${plan.items.length === 1 ? "" : "s"}`, "claim checklist", "reminder"];
  if (genetic.length) parts.splice(1, 0, "DNA option");
  return {
    genetic,
    checklist,
    result: {
      summary: parts.join(" · "),
      why: ["Booking links go to each provider's own page.", `Claim checklist from your policy's rules (${checklist.length} items).`, "Reminder file works with Google, Apple and Outlook calendars."],
    },
  };
}

export { PROVIDERS };
