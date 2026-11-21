import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkupSuggestions, defaultPlan, planTotal } from "../src/lib/checkupPlan.ts";
import { ADD_ONS, BASE_PACKAGE } from "../src/data/test-prices.ts";

const demoText: string = JSON.parse(readFileSync(new URL("../demo/redacted-policy.json", import.meta.url), "utf8")).text;

test("sample policy has no test list → common add-ons", () => {
  const s = checkupSuggestions(demoText);
  assert.equal(s.source, "common");
  assert.equal(s.addOns.length, ADD_ONS.length);
});

test("policy with a test list → only tests from that list", () => {
  const text = "Annual health check-up up to Rs. 5,000. Choose any test from the list below: CBC, HbA1c, Lipid profile, TSH, ECG.";
  const s = checkupSuggestions(text);
  assert.equal(s.source, "policy");
  assert.deepEqual(s.addOns.map((t) => t.id), ["diabetes", "thyroid", "lipid-liver", "heart"]);
});

test("default plan fills up to the limit and never over it", () => {
  for (const limit of [2000, 5000, 10000, 25000]) {
    const picked = defaultPlan(ADD_ONS, limit);
    const total = planTotal(ADD_ONS, picked);
    assert.ok(total <= Math.max(limit, BASE_PACKAGE.priceInr), `limit ${limit}: total ${total}`);
    const left = limit - total;
    for (const t of ADD_ONS) if (!picked.has(t.id)) assert.ok(t.priceInr > left, `limit ${limit}: ${t.id} would still fit`);
  }
});

test("₹10,000 sample: plan uses most of the limit", () => {
  const total = planTotal(ADD_ONS, defaultPlan(ADD_ONS, 10000));
  assert.ok(total >= 9000 && total <= 10000, String(total));
});
