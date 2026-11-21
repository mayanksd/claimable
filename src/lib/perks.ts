import type { Extraction } from "./schema";

export type Perk = Extraction["perks"][number];

const EASY = new Set<Perk["claimMode"]>(["cashless", "in_app", "free"]);

export const isEasy = (p: Perk) => EASY.has(p.claimMode);

/** "Easy" (nothing to claim) or "Needs a claim" (pay first, claim back). Unknown mode → no tag. */
export const effortTag = (p: Perk): "Easy" | "Needs a claim" | null =>
  isEasy(p) ? "Easy" : p.claimMode === "reimbursement" ? "Needs a claim" : null;

/**
 * "Up to sum insured" items (vaccination cover, in-patient benefits…) are hospital cover, not an
 * everyday perk: never in the top 3 or the hero total.
 */
export const isSumInsuredLimited = (p: Perk, sumInsuredInr = 0) =>
  /sum\s*insured|\bS\.?I\.?\b/i.test(p.capLabel) || (sumInsuredInr > 0 && (p.capInr ?? 0) >= sumInsuredInr);

/** A real everyday ₹ cap (e.g. ₹10,000), not "up to sum insured". */
const hasMoneyCap = (p: Perk, sumInsuredInr: number) =>
  typeof p.capInr === "number" && p.capInr > 0 && !isSumInsuredLimited(p, sumInsuredInr);

/** Unlimited or free everyday services with no ₹ cap (teleconsults, in-app discounts). */
const isUnlimitedOrFree = (p: Perk, sumInsuredInr: number) =>
  p.capInr === null &&
  !isSumInsuredLimited(p, sumInsuredInr) &&
  (p.frequency === "unlimited" || p.claimMode === "free" || p.claimMode === "in_app");

/**
 * "Use these this week" (usable-any-time perks only):
 * the biggest ₹ perks first (Easy before Needs a claim on a tie), with the last slot kept for the best
 * unlimited / free perk so there's always one thing to use today. If there is none, ₹ perks fill it.
 */
export function topPerks(perks: Perk[], n = 3, sumInsuredInr = 0): Perk[] {
  const pool = perks.map((p, i) => ({ p, i })).filter(({ p }) => p.category === "use_now");
  // Only explicit ₹ caps or unlimited/free everyday services qualify; "up to sum insured" never does.
  const money = pool
    .filter(({ p }) => hasMoneyCap(p, sumInsuredInr))
    .sort((a, b) => b.p.capInr! - a.p.capInr! || Number(isEasy(b.p)) - Number(isEasy(a.p)) || a.i - b.i)
    .map(({ p }) => p);
  const unlimited = pool
    .filter(({ p }) => isUnlimitedOrFree(p, sumInsuredInr))
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
    (p) => p.category === "use_now" && p.frequency === "per_year" && hasMoneyCap(p, e.policy.sumInsuredInr),
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

const FREQ_LABEL: Record<Perk["frequency"], string> = {
  per_year: "/ year",
  per_policy_term: "/ policy",
  per_event: "/ claim",
  one_time: "once",
  unlimited: "unlimited",
};

/**
 * How a perk's limit is shown on its card: the amount big ("₹25,000"), a small muted frequency
 * ("/ year", "/ policy", "unlimited"), and any qualifier from the label ("50% up to") kept small.
 */
export function perkAmount(p: Perk, sumInsuredInr = 0): { prefix: string; amount: string; freq: string } {
  if (typeof p.capInr === "number" && p.capInr > 0 && !isSumInsuredLimited(p, sumInsuredInr)) {
    const amount = `₹${p.capInr.toLocaleString("en-IN")}`;
    const at = p.capLabel.indexOf(amount);
    // "50% up to ₹10,000" → prefix "50% up to"; "₹1,000/day, max ₹7,000" → prefix "₹1,000/day, max".
    const prefix = at > 0 ? p.capLabel.slice(0, at).trim().replace(/[,:]$/, "") : "";
    return { prefix, amount, freq: FREQ_LABEL[p.frequency] };
  }
  const label = p.capLabel.trim() || "Covered";
  // "Unlimited" already says it; don't add "unlimited" again.
  const freq = /unlimited/i.test(label) || p.frequency !== "unlimited" ? "" : FREQ_LABEL.unlimited;
  return { prefix: "", amount: label, freq };
}

/** The card's description says what it covers; amounts are already shown big, so strip them. */
export function perkDescription(p: Perk): string {
  const cleaned = p.oneLiner
    .replace(/\(?\b(?:up to|upto|max(?:imum)?|capped at|limit(?:ed)? (?:of|to))?\s*(?:₹|Rs\.?|INR)\s?[\d,]+(?:\.\d+)?(?:\s*(?:a|per|\/)\s*(?:policy )?(?:year|yr|policy|claim|event|day))?\)?/gi, "")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/^[\s,.;:–—-]+|[\s,;:–—-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*\./g, ".")
    .trim();
  if (!cleaned) return p.oneLiner.trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Which hero the dashboard shows:
 * - "wording": general policy wording only (no schedule) → honest card, no ₹, no reveal.
 * - "count": no ₹ total for another reason → "You've got N perks…" (never a ₹0 hero).
 * - "value": the ₹ hero.
 */
export function heroMode(e: Pick<Extraction, "isScheduleIncluded" | "perks" | "policy">): "wording" | "count" | "value" {
  if (e.isScheduleIncluded === false) return "wording";
  return computeHeroValue(e).annualPerksValueInr > 0 ? "value" : "count";
}
