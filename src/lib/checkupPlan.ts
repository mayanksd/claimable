// Relative .ts import so the Node test runner can load this file too.
import { ADD_ONS, BASE_PACKAGE, type LabTest } from "../data/test-prices.ts";

export type CheckupSuggestions = {
  /** "policy": the policy lists allowed tests and these come from it. "common": generic add-ons. */
  source: "policy" | "common";
  addOns: LabTest[];
};

// Wording that signals the policy names the tests you may pick.
const TEST_LIST_RE =
  /(choose|select|pick)[^.\n]{0,40}tests?[^.\n]{0,20}(from|in|on)[^.\n]{0,15}list|list of (eligible |covered |allowed )?tests|following tests|tests? (covered|included|allowed)\s*:/i;

/**
 * If the policy text has a list of allowed check-up tests, only suggest add-ons that appear in it.
 * Otherwise suggest common add-ons (to be confirmed with the insurer).
 */
export function checkupSuggestions(policyText: string): CheckupSuggestions {
  if (TEST_LIST_RE.test(policyText)) {
    const text = policyText.toLowerCase();
    const listed = ADD_ONS.filter((t) => t.match.some((m) => text.includes(m)));
    return { source: "policy", addOns: listed };
  }
  return { source: "common", addOns: ADD_ONS };
}

/** Default plan: the base package, then add-ons in order while they fit within the limit. */
export function defaultPlan(addOns: LabTest[], limitInr: number): Set<string> {
  let total = BASE_PACKAGE.priceInr;
  const picked = new Set<string>();
  for (const t of addOns) {
    if (total + t.priceInr <= limitInr) {
      picked.add(t.id);
      total += t.priceInr;
    }
  }
  return picked;
}

export function planTotal(addOns: LabTest[], picked: Set<string>): number {
  return BASE_PACKAGE.priceInr + addOns.filter((t) => picked.has(t.id)).reduce((s, t) => s + t.priceInr, 0);
}
