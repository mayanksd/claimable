import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { effortTag, isCheckupPerk, topPerks } from "../src/lib/perks.ts";

const demo = JSON.parse(readFileSync(new URL("../demo/extraction.json", import.meta.url), "utf8"));

test("top 3 for the sample: check-up ₹10,000, dental ₹10,000, Doctor on call", () => {
  assert.deepEqual(topPerks(demo.perks).map((p) => p.id), ["health-checkup", "opd-dental", "teleconsult"]);
});

test("₹ value first; on a tie Easy beats Needs a claim regardless of order", () => {
  const reordered = [...demo.perks].sort((a: { id: string }) => (a.id === "opd-dental" ? -1 : 0));
  assert.deepEqual(topPerks(reordered).map((p) => p.id), ["health-checkup", "opd-dental", "teleconsult"]);
});

test("no unlimited/free perk → ₹ perks fill all slots", () => {
  const perks = demo.perks.filter((p: { capInr: number | null }) => p.capInr !== null);
  assert.deepEqual(topPerks(perks).map((p) => p.id), ["health-checkup", "opd-dental", "opd"]);
});

test("only unlimited/free perks → they fill the slots", () => {
  const perks = demo.perks.filter((p: { capInr: number | null }) => p.capInr === null);
  assert.deepEqual(topPerks(perks).map((p) => p.id), ["teleconsult", "partner-discounts"]);
});

test("tags", () => {
  const byId = Object.fromEntries(demo.perks.map((p: { id: string }) => [p.id, p]));
  assert.equal(effortTag(byId["health-checkup"]), "Easy");
  assert.equal(effortTag(byId["opd-dental"]), "Needs a claim");
  assert.equal(effortTag(byId["restore"]), null);
});

test("only the health check-up gets the planner, not dental check-ups", () => {
  assert.deepEqual(demo.perks.filter(isCheckupPerk).map((p: { id: string }) => p.id), ["health-checkup"]);
});

import { computeHeroValue } from "../src/lib/perks.ts";

test("hero total: all per-year capped use-now perks; per-policy limits excluded", () => {
  // The real-policy case: diagnostics ₹25,000 + dental ₹10,000 + OPD ₹5,000 showed as ₹25,000.
  const perk = (id: string, capInr: number | null, frequency: string, category = "use_now") =>
    ({ id, emoji: "", name: id, category, capInr, capLabel: "", frequency, claimMode: "reimbursement", useItOrLoseIt: false, oneLiner: "", sourcePage: 2 }) as any;
  const hero = computeHeroValue({
    policy: { annualPremiumInr: 20000 } as any,
    perks: [
      perk("diagnostics", 25000, "per_year"),
      perk("dental", 10000, "per_year"),
      perk("opd", 5000, "per_year"),
      perk("hearing", 10000, "per_policy_term", "good_to_know"),
      perk("lenses", 3000, "per_policy_term"),
      perk("teleconsult", null, "unlimited"),
      perk("air-ambulance", 250000, "per_year", "emergency"),
      perk("restore", 500000, "per_year", "good_to_know"),
    ],
  });
  assert.equal(hero.annualPerksValueInr, 40000);
  assert.deepEqual(hero.includedPerkIds, ["diagnostics", "dental", "opd"]);
  assert.equal(hero.ratioToPremium, 2);
});

test("hero total for the sample stays ₹27,000", () => {
  assert.equal(computeHeroValue(demo).annualPerksValueInr, 27000);
  assert.equal(computeHeroValue({ ...demo, policy: { ...demo.policy, annualPremiumInr: 0 } }).ratioToPremium, 0);
});

import { perkAmount, perkDescription } from "../src/lib/perks.ts";

const mk = (id: string, o: Record<string, unknown>) =>
  ({ id, emoji: "", name: id, category: "use_now", capInr: null, capLabel: "", frequency: "per_year", claimMode: "reimbursement", useItOrLoseIt: false, oneLiner: "", sourcePage: 2, ...o }) as any;

test("top 3 on the user's policy: '₹ caps' and unlimited services only, never 'up to sum insured'", () => {
  const perks = [
    mk("vaccination", { capInr: 500000, capLabel: "Up to sum insured", claimMode: "cashless" }),
    mk("inpatient", { capInr: null, capLabel: "Up to Sum Insured", claimMode: "cashless" }),
    mk("diagnostics", { capInr: 25000, capLabel: "₹25,000" }),
    mk("dental", { capInr: 10000, capLabel: "₹10,000" }),
    mk("checkup", { capInr: 10000, capLabel: "₹10,000", claimMode: "cashless" }),
    mk("teleconsult", { capLabel: "Unlimited", frequency: "unlimited", claimMode: "free" }),
  ];
  assert.deepEqual(topPerks(perks, 3, 500000).map((p) => p.id), ["diagnostics", "checkup", "teleconsult"]);
  // …and they stay out of the hero total too.
  const hero = computeHeroValue({ perks, policy: { sumInsuredInr: 500000, annualPremiumInr: 0 } as any });
  assert.equal(hero.annualPerksValueInr, 45000);
  assert.ok(!hero.includedPerkIds.includes("vaccination"));
});

test("amount display: big number, small frequency, qualifier kept small", () => {
  assert.deepEqual(perkAmount(mk("a", { capInr: 25000, capLabel: "₹25,000" })), { prefix: "", amount: "₹25,000", freq: "/ year" });
  assert.deepEqual(perkAmount(mk("b", { capInr: 10000, capLabel: "50% up to ₹10,000", frequency: "per_policy_term" })), {
    prefix: "50% up to",
    amount: "₹10,000",
    freq: "/ policy",
  });
  assert.deepEqual(perkAmount(mk("c", { capLabel: "Unlimited", frequency: "unlimited" })), { prefix: "", amount: "Unlimited", freq: "" });
  assert.deepEqual(perkAmount(mk("d", { capLabel: "Up to 20%", frequency: "unlimited" })), { prefix: "", amount: "Up to 20%", freq: "unlimited" });
  assert.equal(perkAmount(mk("e", { capInr: 500000, capLabel: "Up to sum insured" }), 500000).amount, "Up to sum insured");
});

test("description doesn't repeat the amount", () => {
  assert.equal(perkDescription(mk("a", { oneLiner: "Up to ₹5,000 a year for consultations, tests and medicines." })), "For consultations, tests and medicines.");
  assert.equal(perkDescription(mk("b", { oneLiner: "MRI, CT and PET scans (up to Rs. 25,000 per policy year), cashless at partner labs." })), "MRI, CT and PET scans, cashless at partner labs.");
  assert.equal(perkDescription(mk("c", { oneLiner: "Book in the app at a partner lab. No bills to pay." })), "Book in the app at a partner lab. No bills to pay.");
  assert.equal(perkDescription(mk("d", { oneLiner: "₹10,000" })), "₹10,000", "never blank");
});

test("sample: descriptions unchanged where they had no amounts", () => {
  for (const p of demo.perks) assert.doesNotMatch(perkDescription(p), /₹\s?[\d,]{3,}/, p.id);
});
