import { z } from "zod";

export const PerkSchema = z.object({
  id: z.string(),
  emoji: z.string().describe("One emoji that represents the perk"),
  name: z.string().describe("Plain-English name, e.g. 'Dental check-ups & treatment'"),
  category: z.enum(["use_now", "good_to_know", "emergency"]),
  capInr: z.number().nullable().describe("Monetary cap in rupees; null if unlimited or non-monetary"),
  capLabel: z.string().describe("Display label, e.g. '₹10,000' or 'Unlimited' or 'Up to 20%'"),
  frequency: z.enum(["per_year", "per_policy_term", "per_event", "unlimited", "one_time"]),
  claimMode: z.enum(["cashless", "reimbursement", "in_app", "free", "unknown"]),
  useItOrLoseIt: z.boolean().describe("True if the limit resets each policy year and is lost if unused"),
  oneLiner: z.string().describe("What it covers and how to use it, max 15 words"),
  sourcePage: z.number().int(),
});

export const RedFlagSchema = z.object({
  id: z.string(),
  emoji: z.string(),
  title: z.string().describe("Short, e.g. 'Road ambulance only ₹3,000'"),
  why: z.string().describe("Why it hurts at claim time, max 20 words"),
  severity: z.enum(["high", "medium"]),
  sourcePage: z.number().int(),
});

export const RewardItemSchema = z.object({
  name: z.string(),
  emoji: z.string(),
  coins: z.number().int(),
  available: z.boolean().describe("False if greyed out / out of stock in the screenshot"),
});

export const MoneyBackSchema = z.object({
  emoji: z.string(),
  title: z.string().describe("Action → reward, e.g. 'Walk 8,000 steps a day → 10% off renewal', max 10 words"),
  detail: z.string().describe("The condition in plain words, max 15 words"),
  sourcePage: z.number().int(),
});

export const TopicItemSchema = z.object({
  id: z.string(),
  emoji: z.string(),
  title: z.string().describe("Plain words, e.g. 'Maternity & delivery'"),
  detail: z.string().describe("Limit or condition in plain words, max 15 words"),
  status: z.enum(["covered", "partly", "waiting", "not_covered"]),
  coveredFrom: z
    .string()
    .nullable()
    .describe("When status is 'waiting': the date cover starts, e.g. '1 Jan 2029' (policy start + waiting period); else null"),
  sourcePage: z.number().int(),
});

const TopicSectionSchema = z.object({
  items: z.array(TopicItemSchema),
  notMentioned: z.array(z.string()).describe("Topics from the checklist that the policy doesn't mention at all"),
});

export const ExtractionSchema = z.object({
  documentType: z
    .enum(["retail_health", "group_health", "pet", "surrogacy", "other"])
    .default("retail_health")
    .describe("retail_health = individual/family health policy; group_health = employer group policy"),
  isScheduleIncluded: z
    .boolean()
    .default(true)
    .describe("True if the policy schedule (holder, sum insured, premium, period) is in the document; false for wording only"),
  policy: z.object({
    insurer: z.string(),
    product: z.string(),
    sumInsuredInr: z.number(),
    tenureYears: z.number(),
    annualPremiumInr: z.number().describe("Gross premium divided by tenure years; 0 if the premium is not in the document"),
    periodLabel: z.string(),
    startDate: z.string().nullable().default(null).describe("Policy start date as YYYY-MM-DD; null if not in the document"),
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
    .default([])
    .describe("Ways to earn money back: wellness reward coins, renewal / no-claim premium discounts, cashback. Empty if none"),
  optionalCovers: z
    .array(PerkSchema)
    .default([])
    .describe("Add-on / optional covers that apply only if bought (not confirmed in the schedule). Not repeated in perks"),
  family: TopicSectionSchema.default({ items: [], notMentioned: [] }).describe(
    "Planning a family: maternity, delivery / C-section limits, newborn cover, vaccinations, IVF / infertility, their waiting periods",
  ),
  lifestyle: TopicSectionSchema.default({ items: [], notMentioned: [] }).describe(
    "Health glow-up (lifestyle care): diabetes, BP, cholesterol, thyroid, weight / obesity incl. bariatric, fatty liver, mental health, chronic-care or diet / weight / stress programmes, wellness coaching",
  ),
  checkupFrequency: z
    .object({
      label: z.string().describe("e.g. 'Once every policy year' or 'Every 3 claim-free years'"),
      everyYear: z.boolean(),
      sourcePage: z.number().int(),
    })
    .nullable()
    .default(null)
    .describe("How often the free health check-up can be used; null if there is no check-up"),
  redFlags: z.array(RedFlagSchema),
  contacts: z.array(z.object({ purpose: z.string(), value: z.string(), sourcePage: z.number().int() })),
  ambiguities: z.array(z.object({ wording: z.string(), questionForInsurer: z.string(), sourcePage: z.number().int() })),
});

export type Extraction = z.infer<typeof ExtractionSchema>;
