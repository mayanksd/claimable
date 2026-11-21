import { z } from "zod";
// Relative .ts import so the Node test runner can load this file too.
import {
  ExtractionSchema,
  MoneyBackSchema,
  PerkSchema,
  RedFlagSchema,
  RewardItemSchema,
  type Extraction,
} from "./schema.ts";
import { withComputedHero } from "./perks.ts";

/**
 * The schema sent to Claude (structured outputs via generateObject).
 *
 * Structured outputs compile the schema into a grammar, and optional properties and unions
 * (anyOf / nullable) multiply its size, especially inside arrays of objects. Keep this schema
 * "flat and required": every property required, no `default`, and no unions beyond the four
 * the original schema already had (perk capInr, rewards, rewards.nextItem, rewards.programmeNote).
 * Missing values come back as sentinels ("" or empty arrays) and normalizeExtraction() maps them
 * to the app shape in ExtractionSchema (nulls, defaults).
 */

const ModelTopicItemSchema = z.object({
  id: z.string(),
  emoji: z.string(),
  title: z.string().describe("Plain words, e.g. 'Maternity & delivery'"),
  detail: z.string().describe("Limit or condition in plain words, max 15 words"),
  status: z.enum(["covered", "partly", "waiting", "not_covered"]),
  coveredFrom: z
    .string()
    .describe("When status is 'waiting': the date cover starts, e.g. '1 Jan 2029' (policy start + waiting period); else empty string"),
  sourcePage: z.number().int(),
});

const ModelTopicSectionSchema = z.object({
  items: z.array(ModelTopicItemSchema),
  notMentioned: z.array(z.string()).describe("Topics from the checklist that the policy doesn't mention at all"),
});

const ModelOptionalCoverSchema = z.object({
  id: z.string(),
  emoji: z.string(),
  name: z.string(),
  capLabel: z.string().describe("Display label, e.g. '₹50,000' or 'Covered'"),
  oneLiner: z.string().describe("What it covers, max 15 words"),
  sourcePage: z.number().int(),
});

export const ExtractionModelSchema = z.object({
  documentType: z
    .enum(["retail_health", "group_health", "pet", "motor", "life", "surrogacy", "other", "not_insurance"])
    .describe("retail_health = individual/family health policy; group_health = employer group policy; motor, life (incl. term), pet, surrogacy; other = other niche insurance; not_insurance = not an insurance document"),
  isScheduleIncluded: z
    .boolean()
    .describe("True if the policy schedule (holder, sum insured, premium, period) is in the document; false for wording only"),
  policy: z.object({
    insurer: z.string(),
    product: z.string(),
    sumInsuredInr: z.number(),
    tenureYears: z.number(),
    annualPremiumInr: z.number().describe("Gross premium divided by tenure years; 0 if the premium is not in the document"),
    periodLabel: z.string(),
    startDate: z.string().describe("Policy start date as YYYY-MM-DD; empty string if not in the document"),
  }),
  perks: z.array(PerkSchema),
  heroValue: z.object({
    annualPerksValueInr: z.number().describe("Sum of capInr for perks with useItOrLoseIt=true and frequency=per_year"),
    ratioToPremium: z.number(),
    includedPerkIds: z.array(z.string()),
  }),
  rewards: z
    .object({
      coinBalance: z.number().int(),
      items: z.array(RewardItemSchema),
      redeemableNow: z.array(z.string()).describe("Names of available items with coins <= balance"),
      nextItem: z.object({ name: z.string(), gap: z.number().int() }).nullable(),
      programmeNote: z.string().nullable().describe("e.g. renewal discount rule from the policy, with page"),
    })
    .nullable()
    .describe("Null if no rewards screenshot was provided"),
  moneyBack: z
    .array(MoneyBackSchema)
    .describe("Ways to earn money back: wellness reward coins, renewal / no-claim premium discounts, cashback. Empty if none"),
  optionalCovers: z
    .array(ModelOptionalCoverSchema)
    .describe("Add-on / optional covers that apply only if bought (not confirmed in the schedule). Empty if none"),
  family: ModelTopicSectionSchema.describe(
    "Planning a family: maternity, delivery / C-section limits, newborn cover, vaccinations, IVF / infertility, their waiting periods",
  ),
  lifestyle: ModelTopicSectionSchema.describe(
    "Health glow-up (lifestyle care): diabetes, BP, cholesterol, thyroid, weight / obesity incl. bariatric, fatty liver, mental health, chronic-care or diet / weight / stress programmes, wellness coaching",
  ),
  checkupFrequency: z
    .object({
      label: z.string().describe("e.g. 'Once every policy year' or 'Every 3 claim-free years'; empty string if there is no check-up"),
      everyYear: z.boolean(),
      sourcePage: z.number().int().describe("0 if there is no check-up"),
    })
    .describe("How often the free health check-up can be used"),
  redFlags: z.array(RedFlagSchema),
  contacts: z.array(z.object({ purpose: z.string(), value: z.string(), sourcePage: z.number().int() })),
  ambiguities: z.array(z.object({ wording: z.string(), questionForInsurer: z.string(), sourcePage: z.number().int() })),
});

export type ExtractionModelOutput = z.infer<typeof ExtractionModelSchema>;

const orNull = (s: string) => (s.trim() ? s.trim() : null);

/** Model output (sentinels) → app shape (nulls and defaults), validated by ExtractionSchema. */
export function normalizeExtraction(m: ExtractionModelOutput): Extraction {
  const topic = (t: ExtractionModelOutput["family"]) => ({
    items: t.items.map((i) => ({ ...i, coveredFrom: orNull(i.coveredFrom) })),
    notMentioned: t.notMentioned,
  });
  return withComputedHero(ExtractionSchema.parse({
    ...m,
    policy: { ...m.policy, startDate: orNull(m.policy.startDate) },
    optionalCovers: m.optionalCovers.map((c) => ({
      ...c,
      category: "good_to_know",
      capInr: null,
      frequency: "per_event",
      claimMode: "unknown",
      useItOrLoseIt: false,
    })),
    family: topic(m.family),
    lifestyle: topic(m.lifestyle),
    checkupFrequency: m.checkupFrequency.label.trim() && m.checkupFrequency.sourcePage > 0 ? m.checkupFrequency : null,
  }));
}

/**
 * Extraction runs as two parallel calls so the dashboard can open as soon as part A is back.
 * A: what the Perks tab needs. B: the other tabs and the document checks.
 */
export const PartASchema = ExtractionModelSchema.pick({
  isScheduleIncluded: true,
  policy: true,
  perks: true,
  heroValue: true,
  rewards: true,
  moneyBack: true,
  optionalCovers: true,
  contacts: true,
});
export const PartBSchema = ExtractionModelSchema.pick({
  documentType: true,
  redFlags: true,
  family: true,
  lifestyle: true,
  ambiguities: true,
  checkupFrequency: true,
});
export type PartA = z.infer<typeof PartASchema>;
export type PartB = z.infer<typeof PartBSchema>;

/** Stand-in for part B while it's still loading (or if it failed). */
export const PART_B_PLACEHOLDER: PartB = {
  documentType: "retail_health",
  redFlags: [],
  family: { items: [], notMentioned: [] },
  lifestyle: { items: [], notMentioned: [] },
  ambiguities: [],
  checkupFrequency: { label: "", everyYear: false, sourcePage: 0 },
};

export const mergeParts = (a: PartA, b: PartB | null): Extraction => normalizeExtraction({ ...a, ...(b ?? PART_B_PLACEHOLDER) });
