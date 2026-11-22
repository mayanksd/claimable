// Steps 3, 5 and 6: shortlist, check against the policy, fit to the limit. All in code (no model).
import { AGE_GROUP_TESTS, FOCUS_MARKERS, PROVIDERS, type Provider } from "../../data/providers.ts";
import type { About, CheckedProvider, CheckupRules, Coverage, FocusId, Plan, PricedProvider } from "./types.ts";

/** What each package check is worth to this person: a base value + their focus + their age band. */
const BASE: Record<string, number> = {
  "blood-basic": 4,
  "liver-kidney": 1.5,
  thyroid: 1.5,
  vitamins: 1.5,
  metabolic: 1.5,
  // Scans are what a premium screening adds over routine blood work.
  mri: 1,
  ldct: 1,
  "heart-calcium": 1,
  dexa: 0.5,
};
const FOCUS_TAGS: Record<FocusId, Record<string, number>> = {
  heart: { "heart-calcium": 6, ecg: 3, "heart-blood": 4, ldct: 1.5, "blood-advanced": 2, vo2: 2, lpa: 3, inflammation: 2 },
  sugar: { metabolic: 5, "blood-advanced": 3, dexa: 2, "liver-kidney": 2, insulin: 4 },
  hormones: { hormones: 6, thyroid: 4, "blood-advanced": 1.5, "thyroid-ab": 3, "female-hormones": 4, testosterone: 4 },
  longevity: { vo2: 4, dexa: 3, mri: 3, "blood-advanced": 3, "cancer-screen": 3, ldct: 2, lung: 1.5, apob: 3, homocysteine: 2 },
  gut: { vitamins: 5, "liver-kidney": 3, "blood-advanced": 1.5, celiac: 3, iron: 3 },
  genetic: { "cancer-screen": 1 },
};
const AGE_TAGS: Record<string, Record<string, number>> = {
  under25: {},
  "25to34": { "blood-advanced": 1, dexa: 0.5 },
  "35to44": { "heart-calcium": 2, "cancer-screen": 1.5, ldct: 1, ecg: 1, "blood-advanced": 1 },
  "45plus": { "heart-calcium": 3, "cancer-screen": 3, ldct: 2, ecg: 1.5, dexa: 1.5, mri: 1, colon: 3, breast: 1 },
};
/** What's commonly included for a body (age-specific tests are gated by `minAge` in the bank). */
const BODY_TAGS: Record<string, Record<string, number>> = {
  female: { womens: 4, "female-hormones": 2, iron: 2, hormones: 1.5, thyroid: 1, vitamins: 1, dexa: 0.5, cervical: 3, breast: 3 },
  male: { mens: 3, testosterone: 2, "heart-blood": 0.5, psa: 3 },
  unspecified: {},
};
const MINOR = 0.6; // any other check a package includes is still worth a little
/** A test two packages both include is worth this much less the second time. */
const DUP_PENALTY = 0.4;

export function tagWeights(about: About): Record<string, number> {
  const w: Record<string, number> = { ...BASE };
  const add = (m: Record<string, number>) => Object.entries(m).forEach(([k, v]) => (w[k] = (w[k] ?? 0) + v));
  about.focus.forEach((f) => add(FOCUS_TAGS[f]));
  if (about.ageBand) add(AGE_TAGS[about.ageBand]);
  add(BODY_TAGS[about.gender]);
  return w;
}

const weightOf = (w: Record<string, number>, tag: string) => MINOR + (w[tag] ?? 0);
const value = (p: Provider, w: Record<string, number>) => p.tags.reduce((s, t) => s + weightOf(w, t), 0);

const BAND_MIN_AGE: Record<string, number> = { under25: 18, "25to34": 25, "35to44": 35, "45plus": 45 };
/** The age used for "commonly from N" checks: the policy age if unchanged, else the band's lower end. */
export const ageFor = (about: About) => about.age ?? (about.ageBand ? BAND_MIN_AGE[about.ageBand] : null);

export type AgeGroupTest = { test: Provider; status: "included" | "later" };

/** Tests commonly included for this body and age group; younger than `minAge` → "later" (shown, not planned). */
export function ageGroupTests(about: About, tests: Provider[] = AGE_GROUP_TESTS): AgeGroupTest[] {
  const age = ageFor(about);
  return tests
    .filter((t) => !t.forBody || t.forBody === about.gender)
    .filter((t) => about.gender !== "unspecified" || !t.forBody)
    .map((t) => ({ test: t, status: age !== null && age >= (t.minAge ?? 0) ? ("included" as const) : ("later" as const) }));
}

/** Step 3: one premium "hero" screening + supporting packages + age-group tests, best match first. Genetic only if chosen. */
export function shortlist(about: About, providers: Provider[] = PROVIDERS) {
  const w = tagWeights(about);
  const byValue = (a: Provider, b: Provider) => value(b, w) - value(a, w) || a.priceInr - b.priceInr;
  // Only providers confirmed for Bengaluru are planned; the rest go under "More labs to compare".
  const local = providers.filter((p) => p.cityConfirmed);
  const heroes = local.filter((p) => p.category === "hero").sort(byValue);
  const supporting = local.filter((p) => p.category === "advanced" || p.category === "standard").sort(byValue);
  const ageGroup = ageGroupTests(about);
  const markers = FOCUS_MARKERS.filter((m) => m.forFocus?.some((f) => about.focus.includes(f)));
  const tests = [...ageGroup.filter((a) => a.status === "included").map((a) => a.test), ...markers].sort(byValue);
  const genetic = about.focus.includes("genetic") ? local.filter((p) => p.category === "genetic") : [];
  return { heroes, supporting, tests, markers, ageGroup, genetic, weights: w };
}

/**
 * The pick each focus is built around. A plan for a focus always starts from these (when they're covered
 * and fit the limit); the rest of the budget is then filled with supporting packages and markers.
 */
export const FOCUS_PICKS: Record<FocusId, { ids: string[]; why: string } | null> = {
  heart: {
    ids: ["cent-fullbody"],
    why: "Heart → Cent Health: the only package here with a heart calcium score (low-dose CT), plus MRI and 100+ biomarkers.",
  },
  longevity: {
    ids: ["uh-pro"],
    why: "Longevity → Ultrahuman Performance Lab Pro: VO2 max, DEXA, lung function and advanced blood in one visit.",
  },
  sugar: {
    ids: ["dh-baseline", "nura-ai"],
    why: "Sugar & metabolism → Deep Holistics Baseline for 100+ metabolic biomarkers, plus Nura's AI screening (low-dose CT, DEXA) for body composition.",
  },
  hormones: {
    ids: ["dh-baseline", "tata1mg-gold"],
    why: "Hormones & thyroid → Deep Holistics Baseline (hormone and thyroid markers) + a standard full body; this focus is about blood markers, not scans.",
  },
  gut: {
    ids: ["dh-baseline", "tata1mg-gold"],
    why: "Gut & vitamins → Deep Holistics Baseline (vitamins, liver and kidney markers) + a standard full body; this focus is about blood markers, not scans.",
  },
  genetic: null,
};

/**
 * Combines the picks for up to two focus areas: the first focus's pick, plus the second's if it still
 * fits (≤ limit, at most one premium screening, everything covered). Returns which focuses shaped it.
 */
export function focusAnchors(items: CheckedProvider[], limitInr: number, focus: FocusId[]) {
  const picks = focus.filter((f) => FOCUS_PICKS[f]);
  const options = [focusAnchor(items, limitInr, picks)];
  // Two focuses whose picks don't fit together: also try each one alone; the fill decides which plan is better.
  if (picks.length === 2) options.push(focusAnchor(items, limitInr, [picks[1], picks[0]]));
  return options.filter((o) => o.items.length);
}

export function focusAnchor(items: CheckedProvider[], limitInr: number, focus: FocusId[]) {
  const usable = (ids: string[]) => {
    const picked = ids.map((id) => items.find((p) => p.id === id));
    if (picked.some((p) => !p || p.coverage !== "covered" || !p.cityConfirmed)) return null;
    const ps = picked as CheckedProvider[];
    if (ps.reduce((t, p) => t + p.priceInr, 0) > limitInr || ps.filter((p) => p.category === "hero").length > 1) return null;
    return ps;
  };
  let ids: string[] = [];
  const used: FocusId[] = [];
  const skipped: FocusId[] = [];
  for (const f of focus) {
    const pick = FOCUS_PICKS[f];
    if (!pick) continue;
    const next = [...new Set([...ids, ...pick.ids])];
    if (usable(next)) {
      ids = next;
      used.push(f);
    } else skipped.push(f);
  }
  return { items: usable(ids) ?? [], used, skipped };
}

const IMAGING = new Set(["mri", "ldct", "dexa", "heart-calcium", "imaging", "breast"]);
/** Neither blood / urine, ECG nor imaging: the sample policy's scope doesn't name these. */
const OTHER_SCREENING = new Set(["cervical", "colon"]);

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
  if (p.tags.some((t) => OTHER_SCREENING.has(t)))
    return res("ask", "Your policy's check-up names blood, urine, ECG and imaging — ask your insurer whether this test counts.");
  return res("covered", `Blood tests and routine screening fit the check-up${page}.`);
}

/**
 * Step 6: the best plan within the limit. Brute force over every combination (the shortlist is small):
 * at most one hero screening, never over the limit, and each test is only counted once —
 * a test two packages both include adds nothing the second time and costs a penalty.
 */
export function fitPlan(items: CheckedProvider[], limitInr: number, about: About): Plan {
  const w = tagWeights(about);
  // A focus fixes the starting pick; the optimiser fills what's left (no second premium screening then).
  const eligible = items.filter((p) => p.cityConfirmed && p.coverage === "covered" && p.category !== "genetic" && p.priceInr <= limitInr);
  const anchors = focusAnchors(items, limitInr, about.focus);
  if (!anchors.length) return fill([], eligible, limitInr, w);
  const plans = anchors.map((a) => ({ ...fill(a.items, eligible.filter((p) => !a.items.includes(p) && p.category !== "hero"), limitInr, w), focusUsed: a.used }));
  return plans.reduce((b, p) => (p.score > b.score ? p : b));
}

function fill(anchor: CheckedProvider[], candidates: CheckedProvider[], limitInr: number, w: Record<string, number>): Plan {
  const pool = candidates.slice(0, 14);
  let best: Plan = { items: [], totalInr: 0, limitInr, score: 0, duplicateTags: [] };
  for (let mask = anchor.length ? 0 : 1; mask < 1 << pool.length; mask++) {
    const pick = [...anchor, ...pool.filter((_, i) => mask & (1 << i))];
    const total = pick.reduce((s, p) => s + p.priceInr, 0);
    if (total > limitInr || pick.filter((p) => p.category === "hero").length > 1) continue;
    const seen = new Map<string, number>();
    pick.forEach((p) => p.tags.forEach((t) => seen.set(t, (seen.get(t) ?? 0) + 1)));
    let score = 0;
    const dup: string[] = [];
    for (const [t, n] of seen) {
      score += weightOf(w, t) - (n - 1) * DUP_PENALTY * weightOf(w, t);
      if (n > 1) dup.push(t);
    }
    score += (total / Math.max(limitInr, 1)) * 2.5; // unused free benefit is lost at the year end: using more of it is a plus
    const better = score > best.score + 1e-9 || (Math.abs(score - best.score) < 1e-9 && total > best.totalInr);
    if (better || best.items.length === 0)
      best = { items: [...pick].sort((a, b) => b.priceInr - a.priceInr), totalInr: total, limitInr, score, duplicateTags: dup };
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
  womens: "women's panel",
  mens: "men's panel",
  iron: "iron & ferritin",
  cervical: "cervical screening",
  breast: "mammogram",
  imaging: "imaging",
  psa: "PSA",
  colon: "bowel screening",
  lpa: "Lipoprotein(a)",
  inflammation: "hs-CRP",
  insulin: "fasting insulin",
  "thyroid-ab": "thyroid antibodies",
  celiac: "celiac screen",
  apob: "ApoB",
  homocysteine: "homocysteine",
};
