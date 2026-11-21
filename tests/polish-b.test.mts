import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatDay, nextPolicyYearStart } from "../src/lib/policyDates.ts";
import { notHealthMessage } from "../src/lib/analysis.ts";
import { claimedTotal } from "../src/lib/claimed.ts";

const demo = JSON.parse(readFileSync(new URL("../demo/extraction.json", import.meta.url), "utf8"));
const day = (s: string) => new Date(s + "T00:00:00Z");

test("check-up resets on the next policy anniversary", () => {
  assert.equal(formatDay(nextPolicyYearStart("2026-01-01", day("2026-11-21"))!), "1 Jan 2027");
  assert.equal(formatDay(nextPolicyYearStart("2026-01-01", day("2027-01-01"))!), "1 Jan 2028");
  assert.equal(formatDay(nextPolicyYearStart("2025-07-15", day("2026-03-01"))!), "15 Jul 2026");
  assert.equal(formatDay(nextPolicyYearStart("2027-04-01", day("2026-11-21"))!), "1 Apr 2028");
  assert.equal(nextPolicyYearStart(null, day("2026-11-21")), null);
  assert.equal(nextPolicyYearStart("1 Jan 2026", day("2026-11-21")), null);
});

test("non-health documents get a plain message; health policies don't", () => {
  assert.equal(notHealthMessage("pet"), "This looks like pet insurance, not a health policy. Please upload your health policy.");
  assert.equal(notHealthMessage("surrogacy"), "This looks like a surrogacy cover, not a health policy. Please upload your health policy.");
  assert.match(notHealthMessage("other")!, /^This looks like a different kind of document/);
  assert.equal(notHealthMessage("retail_health"), null);
  assert.equal(notHealthMessage("group_health"), null);
});

test("claimed total counts only hero perks", () => {
  assert.equal(claimedTotal(demo, new Set()), 0);
  assert.equal(claimedTotal(demo, new Set(["health-checkup", "opd-dental"])), 20000);
  assert.equal(claimedTotal(demo, new Set(["teleconsult", "air-ambulance"])), 0);
  assert.equal(claimedTotal(demo, new Set(demo.heroValue.includedPerkIds)), demo.heroValue.annualPerksValueInr);
});

test("demo data: maternity excluded, lifestyle waits dated, check-up yearly", () => {
  assert.ok(demo.family.items.some((i: { id: string; status: string }) => i.id === "maternity" && i.status === "not_covered"));
  for (const i of demo.lifestyle.items) if (i.status === "waiting") assert.match(i.coveredFrom, /^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
  assert.equal(demo.checkupFrequency.everyYear, true);
});
