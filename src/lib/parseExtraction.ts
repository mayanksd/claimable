// Turns Claude's plain-text answer into a validated ExtractionModelOutput.
// Lenient on purpose: fill what's missing, fix what's obviously fixable, drop only broken list items,
// and fail (so the route can retry once) only when the answer isn't usable JSON at all.
// Relative .ts import so the Node test runner can load this file too.
import type { z } from "zod";
import { ExtractionModelSchema, type ExtractionModelOutput } from "./modelSchema.ts";

export type ParseResult<T = ExtractionModelOutput> =
  | { ok: true; data: T; dropped: string[]; repaired: boolean }
  | { ok: false; issues: string[] };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Strips code fences and surrounding prose; returns the outermost {...} or null. */
export function extractJsonText(text: string): string | null {
  const unfenced = text.replace(/```(?:json|JSON)?\s*/g, "").replace(/```/g, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  return start >= 0 && end > start ? unfenced.slice(start, end + 1) : null;
}

/** JSON.parse with one small repair pass (trailing commas, smart quotes around keys/values). */
export function parseJsonLoose(text: string): { ok: true; value: unknown; repaired: boolean } | { ok: false; error: string } {
  const json = extractJsonText(text);
  if (!json) return { ok: false, error: "No JSON object found in the answer." };
  try {
    return { ok: true, value: JSON.parse(json), repaired: false };
  } catch (first) {
    const fixed = json.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, "$1");
    try {
      return { ok: true, value: JSON.parse(fixed), repaired: true };
    } catch {
      return { ok: false, error: `Invalid JSON: ${(first as Error).message}` };
    }
  }
}

const ENUM_KEYS = new Set(["documentType", "category", "frequency", "claimMode", "severity", "status"]);
const NUMBER_KEYS = new Set([
  "sourcePage", "capInr", "sumInsuredInr", "tenureYears", "annualPremiumInr",
  "annualPerksValueInr", "ratioToPremium", "coinBalance", "coins", "gap",
]);

/** "Cashless" → "cashless", "Use now" → "use_now"; "₹10,000" → 10000. */
function tidy(v: unknown, key?: string): unknown {
  if (Array.isArray(v)) return v.map((x) => tidy(x));
  if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, tidy(x, k)]));
  if (key && ENUM_KEYS.has(key) && typeof v === "string") return v.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key && NUMBER_KEYS.has(key) && typeof v === "string") {
    const digits = v.replace(/[^\d.]/g, "");
    // Only convert real numbers ("2", "₹10,000"); leave text like "lots" for validation to flag.
    return /\d/.test(digits) && Number.isFinite(Number(digits)) ? Number(digits) : v;
  }
  return v;
}

const arr = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(isObj) : []);
const withDefaults = (items: unknown, prefix: string, defaults: Obj): Obj[] =>
  arr(items).map((it, i) => ({ id: `${prefix}-${i + 1}`, ...defaults, ...it }));
const merge = (v: unknown, defaults: Obj): Obj => ({ ...defaults, ...(isObj(v) ? v : {}) });
const topic = (v: unknown, prefix: string): Obj => {
  const t = merge(v, { items: [], notMentioned: [] });
  return {
    items: withDefaults(t.items, prefix, { emoji: "•", detail: "", coveredFrom: "" }).map((i) => ({
      ...i,
      coveredFrom: typeof i.coveredFrom === "string" ? i.coveredFrom : "",
    })),
    notMentioned: Array.isArray(t.notMentioned) ? t.notMentioned.filter((x) => typeof x === "string") : [],
  };
};

/** Fills every key the model schema requires with a safe default. */
export function fillDefaults(raw: unknown): Obj {
  const r = isObj(tidy(raw)) ? (tidy(raw) as Obj) : {};
  const rewards = isObj(r.rewards)
    ? {
        ...merge(r.rewards, { items: [], redeemableNow: [], nextItem: null, programmeNote: null }),
        items: withDefaults((r.rewards as Obj).items, "reward", { emoji: "🎁", available: true }),
      }
    : null;
  const freq = isObj(r.checkupFrequency) ? r.checkupFrequency : {};
  return {
    documentType: r.documentType ?? "retail_health",
    isScheduleIncluded: typeof r.isScheduleIncluded === "boolean" ? r.isScheduleIncluded : true,
    policy: {
      ...merge(r.policy, { insurer: "", product: "", sumInsuredInr: 0, tenureYears: 1, annualPremiumInr: 0, periodLabel: "", startDate: "" }),
      ...(isObj(r.policy) && typeof r.policy.startDate !== "string" ? { startDate: "" } : {}),
    },
    perks: withDefaults(r.perks, "perk", { emoji: "✨", oneLiner: "", capInr: null, useItOrLoseIt: false, claimMode: "unknown" }),
    heroValue: merge(r.heroValue, { annualPerksValueInr: 0, ratioToPremium: 0, includedPerkIds: [] }),
    rewards,
    moneyBack: arr(r.moneyBack).map((m) => ({ emoji: "💰", detail: "", ...m })),
    optionalCovers: withDefaults(r.optionalCovers, "optional", { emoji: "➕", oneLiner: "", capLabel: "Optional" }),
    family: topic(r.family, "family"),
    lifestyle: topic(r.lifestyle, "lifestyle"),
    checkupFrequency: {
      label: typeof freq.label === "string" ? freq.label : "",
      everyYear: typeof freq.everyYear === "boolean" ? freq.everyYear : false,
      sourcePage: typeof freq.sourcePage === "number" ? freq.sourcePage : 0,
    },
    redFlags: withDefaults(r.redFlags, "flag", { emoji: "⚠️", why: "" }),
    contacts: arr(r.contacts),
    ambiguities: arr(r.ambiguities),
  };
}

const describe = (path: PropertyKey[], message: string) => `${path.map(String).join(".") || "(root)"}: ${message}`;

/** Removes the list item each issue points at (e.g. perks.3.claimMode → drop perks[3]). */
function dropBrokenItems(data: Obj, paths: PropertyKey[][]): string[] {
  const toDrop = new Map<string, { container: unknown[]; indexes: Set<number>; label: string }>();
  for (const path of paths) {
    const at = path.findIndex((p) => typeof p === "number");
    if (at < 0) continue;
    let container: unknown = data;
    for (const p of path.slice(0, at)) container = (container as Obj)[p as string];
    if (!Array.isArray(container)) continue;
    const label = path.slice(0, at).map(String).join(".");
    const entry = toDrop.get(label) ?? { container, indexes: new Set<number>(), label };
    entry.indexes.add(path[at] as number);
    toDrop.set(label, entry);
  }
  const dropped: string[] = [];
  for (const { container, indexes, label } of toDrop.values()) {
    for (const i of [...indexes].sort((a, b) => b - a)) {
      container.splice(i, 1);
      dropped.push(`${label}[${i}]`);
    }
  }
  return dropped;
}

/** Text → validated full extraction, or readable issues for a retry. */
export const parseExtraction = (text: string) => parseWith(text, ExtractionModelSchema);

/** Text → output validated against `schema` (the full schema or one part of it). */
export function parseWith<T>(text: string, schema: z.ZodType<T>): ParseResult<T> {
  const parsed = parseJsonLoose(text);
  if (!parsed.ok) return { ok: false, issues: [parsed.error] };
  if (!isObj(parsed.value)) return { ok: false, issues: ["(root): expected a JSON object"] };

  const data = fillDefaults(parsed.value);
  let result = schema.safeParse(data);
  const dropped: string[] = [];
  for (let pass = 0; !result.success && pass < 3; pass++) {
    // A broken rewards block shouldn't sink the whole policy.
    if (result.error.issues.some((i) => i.path[0] === "rewards" && typeof i.path[1] !== "number" && i.path[1] !== "items")) {
      data.rewards = null;
      dropped.push("rewards");
    }
    const removed = dropBrokenItems(data, result.error.issues.map((i) => i.path));
    if (!removed.length && !dropped.includes("rewards")) break;
    dropped.push(...removed);
    result = schema.safeParse(data);
  }
  if (!result.success) return { ok: false, issues: result.error.issues.slice(0, 12).map((i) => describe(i.path, i.message)) };
  return { ok: true, data: result.data, dropped, repaired: parsed.repaired };
}
