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

export const ExtractionSchema = z.object({
  policy: z.object({
    insurer: z.string(),
    product: z.string(),
    sumInsuredInr: z.number(),
    tenureYears: z.number(),
    annualPremiumInr: z.number().describe("Gross premium divided by tenure years; 0 if the premium is not in the document"),
    periodLabel: z.string(),
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
  redFlags: z.array(RedFlagSchema),
  contacts: z.array(z.object({ purpose: z.string(), value: z.string(), sourcePage: z.number().int() })),
  ambiguities: z.array(z.object({ wording: z.string(), questionForInsurer: z.string(), sourcePage: z.number().int() })),
});

export type Extraction = z.infer<typeof ExtractionSchema>;
