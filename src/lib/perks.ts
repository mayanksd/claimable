import type { Extraction } from "./schema";

export type Perk = Extraction["perks"][number];

const EASY = new Set<Perk["claimMode"]>(["cashless", "in_app", "free"]);

export const isEasy = (p: Perk) => EASY.has(p.claimMode);

/** "Easy" (nothing to claim) or "Needs a claim" (pay first, claim back). Unknown mode → no tag. */
export const effortTag = (p: Perk): "Easy" | "Needs a claim" | null =>
  isEasy(p) ? "Easy" : p.claimMode === "reimbursement" ? "Needs a claim" : null;

/** Unlimited or free-to-use perks with no ₹ cap (teleconsults, in-app discounts). */
const isUnlimitedOrFree = (p: Perk) => p.capInr === null && (p.frequency === "unlimited" || isEasy(p));

/**
 * "Use these this week" (usable-any-time perks only):
 * the biggest ₹ perks first (Easy before Needs a claim on a tie), with the last slot kept for the best
 * unlimited / free perk so there's always one thing to use today. If there is none, ₹ perks fill it.
 */
export function topPerks(perks: Perk[], n = 3): Perk[] {
  const pool = perks.map((p, i) => ({ p, i })).filter(({ p }) => p.category === "use_now");
  const money = pool
    .filter(({ p }) => p.capInr !== null)
    .sort((a, b) => b.p.capInr! - a.p.capInr! || Number(isEasy(b.p)) - Number(isEasy(a.p)) || a.i - b.i)
    .map(({ p }) => p);
  const unlimited = pool
    .filter(({ p }) => isUnlimitedOrFree(p))
    .sort((a, b) => Number(isEasy(b.p)) - Number(isEasy(a.p)) || a.i - b.i)
    .map(({ p }) => p);

  const picked = [...money.slice(0, unlimited.length ? n - 1 : n), ...unlimited.slice(0, 1)];
  for (const p of [...money, ...unlimited]) if (picked.length < n && !picked.includes(p)) picked.push(p);
  return picked.slice(0, n);
}

/** "health check-up", "annual checkup"… but not "dental check-ups" or "eye check-up". */
export const HEALTH_CHECKUP_RE = /(?<!(dental|eye|vision)\s)check-?\s?ups?\b/i;

/** The annual health check-up perk, if the policy has one with a ₹ limit. */
export const isCheckupPerk = (p: Perk) => HEALTH_CHECKUP_RE.test(p.name) && (p.capInr ?? 0) > 0;

/**
 * The hero total, computed in code rather than trusted from the model:
 * every "use any time" perk with a ₹ cap that resets each policy year.
 * Excluded: "per policy" limits (once across the whole tenure), per-event limits, and
 * hospital / emergency cover (air ambulance, sum-insured restore) which isn't money you'd use this year.
 */
export function computeHeroValue(e: Pick<Extraction, "perks" | "policy">): Extraction["heroValue"] {
  const included = e.perks.filter(
    (p) => p.category === "use_now" && p.frequency === "per_year" && typeof p.capInr === "number" && p.capInr > 0,
  );
  const total = included.reduce((s, p) => s + (p.capInr ?? 0), 0);
  const premium = e.policy.annualPremiumInr;
  return {
    annualPerksValueInr: total,
    ratioToPremium: premium > 0 ? Math.round((total / premium) * 10) / 10 : 0,
    includedPerkIds: included.map((p) => p.id),
  };
}

export const withComputedHero = <E extends Pick<Extraction, "perks" | "policy" | "heroValue">>(e: E): E => ({
  ...e,
  heroValue: computeHeroValue(e),
});
