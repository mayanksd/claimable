import type { Extraction } from "./schema";

/** ₹ claimed so far, counting only the perks that make up the hero total. */
export function claimedTotal(e: Pick<Extraction, "perks" | "heroValue">, claimed: Set<string>): number {
  const included = new Set(e.heroValue.includedPerkIds);
  return e.perks.filter((p) => included.has(p.id) && claimed.has(p.id)).reduce((s, p) => s + (p.capInr ?? 0), 0);
}

/** One localStorage key per policy, so a new upload starts fresh. */
export const claimedKey = (e: Pick<Extraction, "policy">) =>
  `claimable:claimed:${e.policy.product}|${e.policy.periodLabel}`;
