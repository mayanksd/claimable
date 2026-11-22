// Steps 3, 5 and 6: shortlist, check against the policy, fit to the limit. All in code (no model).
import { PROVIDERS, type Provider } from "../../data/providers.ts";
import type { About, CheckedProvider, CheckupRules, Coverage, FocusId, Plan, PricedProvider } from "./types.ts";

/** What each package check is worth to this person: a base value + their focus + their age band. */
const BASE: Record<string, number> = { "blood-basic": 4, "liver-kidney": 1.5, thyroid: 1.5, vitamins: 1.5, metabolic: 1.5 };
const FOCUS_TAGS: Record<FocusId, Record<string, number>> = {
  heart: { "heart-calcium": 6, ecg: 3, "heart-blood": 4, ldct: 1.5, "blood-advanced": 2, vo2: 2 },
  sugar: { metabolic: 5, "blood-advanced": 3, dexa: 2, "liver-kidney": 2 },
  hormones: { hormones: 6, thyroid: 4, "blood-advanced": 1.5 },
  longevity: { vo2: 4, dexa: 3, mri: 3, "blood-advanced": 3, "cancer-screen": 3, ldct: 2, lung: 1.5 },
  gut: { vitamins: 5, "liver-kidney": 3, "blood-advanced": 1.5 },
  genetic: { "cancer-screen": 1 },
};
const AGE_TAGS: Record<string, Record<string, number>> = {
  under25: {},
  "25to34": { "blood-advanced": 1, dexa: 0.5 },
  "35to44": { "heart-calcium": 2, "cancer-screen": 1.5, ldct: 1, ecg: 1, "blood-advanced": 1 },
  "45plus": { "heart-calcium": 3, "cancer-screen": 3, ldct: 2, ecg: 1.5, dexa: 1.5, mri: 1 },
};
const MINOR = 0.6; // any other check a package includes is still worth a little

export function tagWeights(about: About): Record<string, number> {
  const w: Record<string, number> = { ...BASE };
  const add = (m: Record<string, number>) => Object.entries(m).forEach(([k, v]) => (w[k] = (w[k] ?? 0) + v));
  about.focus.forEach((f) => add(FOCUS_TAGS[f]));
  if (about.ageBand) add(AGE_TAGS[about.ageBand]);
  if (about.gender === "female") add({ thyroid: 1, vitamins: 1, dexa: 0.5 });
  return w;
}

const weightOf = (w: Record<string, number>, tag: string) => w[tag] ?? MINOR;
const value = (p: Provider, w: Record<string, number>) => p.tags.reduce((s, t) => s + weightOf(w, t), 0);

/** Step 3: one premium "hero" screening + supporting packages, best match first. Genetic only if chosen. */
export function shortlist(about: About, providers: Provider[] = PROVIDERS) {
  const w = tagWeights(about);
  const byValue = (a: Provider, b: Provider) => value(b, w) - value(a, w) || a.priceInr - b.priceInr;
  const heroes = providers.filter((p) => p.category === "hero").sort(byValue);
  const supporting = providers.filter((p) => p.category === "advanced" || p.category === "standard").sort(byValue);
  const genetic = about.focus.includes("genetic") ? providers.filter((p) => p.category === "genetic") : [];
  return { heroes, supporting, genetic, weights: w };
}

const IMAGING = new Set(["mri", "ldct", "dexa", "heart-calcium"]);

/** Step 5: each package against the policy's check-up rules. */
export function checkCoverage(p: PricedProvider, rules: CheckupRules): CheckedProvider {
  const page = rules.sourcePage ? ` (policy p.${rules.sourcePage})` : "";
  const res = (coverage: Coverage, coverageWhy: string): CheckedProvider => ({ ...p, coverage, coverageWhy });
  if (!rules.found) return res("ask", "Your policy doesn't show a check-up limit — ask your insurer before booking.");
  if (p.category === "genetic") {
    if (rules.geneticRule === "prescription")
      return res("prescription", "Genetic tests are covered only when a doctor prescribes them for a medical reason.");
    if (rules.geneticRule === "covered") return res("covered", `Genetic tests are listed under the check-up${page}.`);
    if (rules.geneticRule === "excluded") return res("ask", "Your policy says wellness genetic tests aren't covered — ask your insurer.");
    return res("ask", "Your policy doesn't mention genetic tests — ask your insurer before booking.");
  }
  if (p.tags.some((t) => IMAGING.has(t))) {
    if (rules.imagingAllowed === true) return res("covered", `Imaging and advanced screening are allowed within the limit${page}.`);
    if (rules.imagingAllowed === false) return res("ask", "Your policy excludes imaging in the check-up — ask your insurer.");
    return res("ask", "Your policy doesn't say whether scans (MRI / CT / DEXA) count — ask your insurer.");
  }
  return res("covered", `Blood tests and routine screening fit the check-up${page}.`);
}

/**
 * Step 6: the best plan within the limit. Brute force over every combination (the shortlist is small):
 * at most one hero screening, never over the limit, and each test is only counted once —
 * a test two packages both include adds nothing the second time and costs a penalty.
 */
export function fitPlan(items: CheckedProvider[], limitInr: number, about: About): Plan {
  const w = tagWeights(about);
  const pool = items.filter((p) => p.coverage === "covered" && p.category !== "genetic" && p.priceInr <= limitInr).slice(0, 12);
  let best: Plan = { items: [], totalInr: 0, limitInr, score: 0, duplicateTags: [] };
  for (let mask = 1; mask < 1 << pool.length; mask++) {
    const pick = pool.filter((_, i) => mask & (1 << i));
    const total = pick.reduce((s, p) => s + p.priceInr, 0);
    if (total > limitInr || pick.filter((p) => p.category === "hero").length > 1) continue;
    const seen = new Map<string, number>();
    pick.forEach((p) => p.tags.forEach((t) => seen.set(t, (seen.get(t) ?? 0) + 1)));
    let score = 0;
    const dup: string[] = [];
    for (const [t, n] of seen) {
      score += weightOf(w, t) - (n - 1) * 0.5 * weightOf(w, t);
      if (n > 1) dup.push(t);
    }
    score += (total / Math.max(limitInr, 1)) * 0.5; // using more of a free benefit is a small plus
    const better = score > best.score + 1e-9 || (Math.abs(score - best.score) < 1e-9 && total > best.totalInr);
    if (better) best = { items: pick.sort((a, b) => b.priceInr - a.priceInr), totalInr: total, limitInr, score, duplicateTags: dup };
  }
  return best;
}

/** Friendly names for the tags, for "Also in: …" overlap notes. */
export const TAG_LABEL: Record<string, string> = {
  mri: "MRI",
  ldct: "low-dose CT",
  "heart-calcium": "heart calcium score",
  dexa: "DEXA",
  "blood-basic": "routine blood tests",
  "blood-advanced": "advanced blood panel",
  thyroid: "thyroid",
  vitamins: "vitamins",
  metabolic: "sugar & metabolism",
  "liver-kidney": "liver & kidney",
  "cancer-screen": "cancer screening",
  ecg: "ECG",
  consult: "doctor consult",
  hormones: "hormones",
  "heart-blood": "cardiac blood markers",
  vo2: "VO2 max",
  lung: "lung function",
  hearing: "hearing",
  eye: "eye scan",
  dna: "DNA",
};
