import type { Extraction } from "./schema";

const hasPage = (x: { sourcePage?: number | null }) => typeof x.sourcePage === "number" && x.sourcePage >= 1;

/** CLAUDE.md rule: every perk and red flag must cite a page; drop the ones that don't. */
export function withSourcesOnly(e: Extraction): Extraction {
  return {
    ...e,
    perks: e.perks.filter(hasPage),
    redFlags: e.redFlags.filter(hasPage),
    moneyBack: e.moneyBack.filter(hasPage),
    optionalCovers: e.optionalCovers.filter(hasPage),
    family: { ...e.family, items: e.family.items.filter(hasPage) },
    lifestyle: { ...e.lifestyle, items: e.lifestyle.items.filter(hasPage) },
  };
}
