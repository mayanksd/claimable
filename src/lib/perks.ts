import type { Extraction } from "./schema";

export type Perk = Extraction["perks"][number];

const EASY = new Set<Perk["claimMode"]>(["cashless", "in_app", "free"]);

export const isEasy = (p: Perk) => EASY.has(p.claimMode);

/** "Easy" (nothing to claim) or "Needs a claim" (pay first, claim back). Unknown mode → no tag. */
export const effortTag = (p: Perk): "Easy" | "Needs a claim" | null =>
  isEasy(p) ? "Easy" : p.claimMode === "reimbursement" ? "Needs a claim" : null;

/**
 * Perks to use this week: usable-any-time perks, easy ones first
 * (cashless / in-app / free before reimbursement), then bigger ₹ caps first.
 */
export function topPerks(perks: Perk[], n = 3): Perk[] {
  const rank = (p: Perk) => (isEasy(p) ? 0 : p.claimMode === "reimbursement" ? 1 : 2);
  return perks
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.category === "use_now")
    .sort((a, b) => rank(a.p) - rank(b.p) || (b.p.capInr ?? -1) - (a.p.capInr ?? -1) || a.i - b.i)
    .slice(0, n)
    .map(({ p }) => p);
}
