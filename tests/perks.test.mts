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
