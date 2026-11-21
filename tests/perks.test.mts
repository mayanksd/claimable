import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { effortTag, topPerks } from "../src/lib/perks.ts";

const demo = JSON.parse(readFileSync(new URL("../demo/extraction.json", import.meta.url), "utf8"));

test("top 3: easy perks first, bigger ₹ first, use_now only", () => {
  const top = topPerks(demo.perks);
  assert.deepEqual(top.map((p) => p.id), ["health-checkup", "teleconsult", "partner-discounts"]);
});

test("reimbursement perks fill in when there are fewer than 3 easy ones", () => {
  const perks = demo.perks.filter((p: { id: string }) => !["teleconsult", "partner-discounts"].includes(p.id));
  assert.deepEqual(topPerks(perks).map((p) => p.id), ["health-checkup", "opd-dental", "opd"]);
});

test("tags", () => {
  const byId = Object.fromEntries(demo.perks.map((p: { id: string }) => [p.id, p]));
  assert.equal(effortTag(byId["health-checkup"]), "Easy");
  assert.equal(effortTag(byId["opd-dental"]), "Needs a claim");
  assert.equal(effortTag(byId["restore"]), null);
});
