// Order for the Planning a family? / Health glow-up lists: good news first.
type Status = "covered" | "partly" | "waiting" | "not_covered";

const RANK: Record<Status, number> = { covered: 0, partly: 1, waiting: 2, not_covered: 3 };

/** Covered (and partly covered) first, then waiting periods; not-covered items split out for a collapsed section. */
export function splitTopicItems<T extends { status: Status }>(items: T[]): { shown: T[]; notCovered: T[] } {
  const ordered = items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => RANK[a.item.status] - RANK[b.item.status] || a.i - b.i)
    .map(({ item }) => item);
  return {
    shown: ordered.filter((x) => x.status !== "not_covered"),
    notCovered: ordered.filter((x) => x.status === "not_covered"),
  };
}
