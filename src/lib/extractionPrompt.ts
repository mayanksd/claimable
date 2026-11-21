// Builds the extraction system prompt for plain-text JSON output (no structured outputs:
// the grammar for our schema is too large for the API to compile).
// Relative .ts imports so the Node test runner can load this file too.
import { ExtractionModelSchema, type ExtractionModelOutput } from "./modelSchema.ts";
import { PerkSchema, RedFlagSchema } from "./schema.ts";

/**
 * A compact, complete example of the shape we want back. Typed as ExtractionModelOutput,
 * so it cannot drift from the schema without a type error (and a test validates it too).
 */
export const SHAPE_EXAMPLE: ExtractionModelOutput = {
  documentType: "retail_health",
  isScheduleIncluded: true,
  policy: {
    insurer: "Example General Insurance",
    product: "Example Health Plus",
    sumInsuredInr: 1000000,
    tenureYears: 1,
    annualPremiumInr: 12800,
    periodLabel: "1 Jan 2026 – 31 Dec 2026",
    startDate: "2026-01-01",
  },
  perks: [
    {
      id: "health-checkup",
      emoji: "🩺",
      name: "Free annual health check-up",
      category: "use_now",
      capInr: 10000,
      capLabel: "₹10,000",
      frequency: "per_year",
      claimMode: "cashless",
      useItOrLoseIt: true,
      oneLiner: "Book in the app at a partner lab. No bills to pay.",
      sourcePage: 2,
    },
    {
      id: "teleconsult",
      emoji: "📞",
      name: "Doctor on call",
      category: "use_now",
      capInr: null,
      capLabel: "Unlimited",
      frequency: "unlimited",
      claimMode: "free",
      useItOrLoseIt: false,
      oneLiner: "GP and specialist teleconsults, 24x7 in the app.",
      sourcePage: 2,
    },
  ],
  heroValue: { annualPerksValueInr: 10000, ratioToPremium: 0.8, includedPerkIds: ["health-checkup"] },
  rewards: {
    coinBalance: 5271,
    items: [{ name: "Hand grip", emoji: "✊", coins: 2000, available: true }],
    redeemableNow: ["Hand grip"],
    nextItem: { name: "Resistance band", gap: 329 },
    programmeNote: "Average 8,000 steps a day for 10% off renewal (page 3).",
  },
  moneyBack: [
    { emoji: "👟", title: "Walk 8,000 steps a day → 10% off renewal", detail: "Average over the policy year.", sourcePage: 3 },
  ],
  optionalCovers: [
    { id: "global", emoji: "🌍", name: "Global cover", capLabel: "Add-on", oneLiner: "Treatment abroad, only if you bought it.", sourcePage: 5 },
  ],
  family: {
    items: [
      { id: "maternity", emoji: "🤰", title: "Maternity & delivery", detail: "Not covered.", status: "not_covered", coveredFrom: "", sourcePage: 2 },
    ],
    notMentioned: ["IVF / infertility"],
  },
  lifestyle: {
    items: [
      {
        id: "ped",
        emoji: "⏳",
        title: "Conditions you had before buying",
        detail: "Covered after a 36-month wait.",
        status: "waiting",
        coveredFrom: "1 Jan 2029",
        sourcePage: 4,
      },
    ],
    notMentioned: ["Mental health"],
  },
  checkupFrequency: { label: "Once every policy year", everyYear: true, sourcePage: 2 },
  redFlags: [
    {
      id: "room-rent",
      emoji: "🏨",
      title: "Room rent capped at ₹10,000 a day",
      why: "A pricier room cuts your whole claim proportionately.",
      severity: "high",
      sourcePage: 2,
    },
  ],
  contacts: [{ purpose: "24x7 helpline", value: "1800 000 1234", sourcePage: 3 }],
  ambiguities: [
    { wording: "Check-up 'once per policy year'", questionForInsurer: "Does an unused check-up carry forward?", sourcePage: 2 },
  ],
};

const familyStatus = ExtractionModelSchema.shape.family.shape.items.element.shape.status.options;

/** Allowed enum values, generated from the Zod schemas so they never drift. */
const ALLOWED = [
  `documentType: ${ExtractionModelSchema.shape.documentType.options.join(" | ")}`,
  `perks[].category: ${PerkSchema.shape.category.options.join(" | ")}`,
  `perks[].frequency: ${PerkSchema.shape.frequency.options.join(" | ")}`,
  `perks[].claimMode: ${PerkSchema.shape.claimMode.options.join(" | ")}`,
  `redFlags[].severity: ${RedFlagSchema.shape.severity.options.join(" | ")}`,
  `family.items[].status and lifestyle.items[].status: ${familyStatus.join(" | ")}`,
].join("\n");

const outputRules = (shape: object, onlyKeys?: readonly string[]) => `Output format
Return ONLY a single JSON object matching this shape. No markdown fences, no text before or after it.${
  onlyKeys ? `\nThis request covers only these keys: ${onlyKeys.join(", ")}. Leave every other part of the policy out.` : ""
}
Every key shown is required. Use the example only for its shape and value types, never for its content.
- perks[].capInr: a number, or null when the cap isn't a rupee amount (unlimited, a percentage, a count).
- rewards: null if no app screenshot was provided; rewards.nextItem and rewards.programmeNote may be null.
- When something is missing use "" for text (policy.startDate, coveredFrom, checkupFrequency.label), 0 for numbers, [] for lists.
- If there is no free check-up: checkupFrequency = {"label": "", "everyYear": false, "sourcePage": 0}.
- sourcePage is the [[PAGE n]] number the item came from.

Allowed values
${ALLOWED}

Shape:
${JSON.stringify(shape)}`;

export const buildExtractionSystem = (basePrompt: string) => `${basePrompt.trim()}\n\n${outputRules(SHAPE_EXAMPLE)}`;

/** Keys returned by each of the two parallel extraction calls (must match PartASchema / PartBSchema). */
export const PART_KEYS = {
  A: ["isScheduleIncluded", "policy", "perks", "heroValue", "rewards", "moneyBack", "optionalCovers", "contacts"],
  B: ["documentType", "redFlags", "family", "lifestyle", "ambiguities", "checkupFrequency"],
} as const satisfies Record<"A" | "B", readonly (keyof ExtractionModelOutput)[]>;

const pick = (keys: readonly (keyof ExtractionModelOutput)[]) =>
  Object.fromEntries(keys.map((k) => [k, SHAPE_EXAMPLE[k]]));

/** System prompt for one part of the split extraction: same rules, a shape with only that part's keys. */
export const buildPartSystem = (basePrompt: string, part: "A" | "B") =>
  `${basePrompt.trim()}\n\n${outputRules(pick(PART_KEYS[part]), PART_KEYS[part])}`;
