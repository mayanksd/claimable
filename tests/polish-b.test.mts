import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatDay, nextPolicyYearStart } from "../src/lib/policyDates.ts";
import { isWrongDocumentMessage, notHealthMessage } from "../src/lib/analysis.ts";
import { SCANNED_PDF_MESSAGE } from "../src/lib/limits.ts";
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

test("non-health documents get a fun one-liner; health policies don't", () => {
  assert.equal(notHealthMessage("pet"), "Cute policy, wrong species 🐶 — try a human health policy?");
  assert.equal(notHealthMessage("motor"), "Vroom vroom — that's car insurance. I fix humans, not bumpers 🚗");
  assert.equal(notHealthMessage("life"), "That's life insurance — I'm all about the living-well perks of health cover 🕊️");
  assert.equal(notHealthMessage("surrogacy"), "Interesting policy! But I'm built for everyday health insurance 🍼");
  assert.equal(notHealthMessage("other"), notHealthMessage("surrogacy"));
  assert.equal(notHealthMessage("not_insurance"), "Nice PDF! Not a health policy though 😄 Try again?");
  assert.equal(notHealthMessage("retail_health"), null);
  assert.equal(notHealthMessage("group_health"), null);
});

test("wrong-document messages (incl. scanned) are recognised for the 'Try another PDF' card", () => {
  for (const t of ["pet", "motor", "life", "surrogacy", "other", "not_insurance"]) assert.ok(isWrongDocumentMessage(notHealthMessage(t)), t);
  assert.ok(isWrongDocumentMessage(SCANNED_PDF_MESSAGE));
  assert.equal(SCANNED_PDF_MESSAGE, "This PDF is all pictures, no words 📸 — try the digital copy from your insurer's email.");
  assert.ok(!isWrongDocumentMessage("The AI couldn't read this policy just now. Please try again in a moment."));
});

test("claimed total counts only hero perks", () => {
  assert.equal(claimedTotal(demo, new Set()), 0);
  assert.equal(claimedTotal(demo, new Set(["health-checkup", "opd-dental"])), 40000);
  assert.equal(claimedTotal(demo, new Set(["teleconsult", "air-ambulance"])), 0);
  assert.equal(claimedTotal(demo, new Set(demo.heroValue.includedPerkIds)), demo.heroValue.annualPerksValueInr);
});

test("demo data: maternity excluded, lifestyle waits dated, check-up yearly", () => {
  assert.ok(demo.family.items.some((i: { id: string; status: string }) => i.id === "maternity" && i.status === "not_covered"));
  for (const i of demo.lifestyle.items) if (i.status === "waiting") assert.match(i.coveredFrom, /^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
  assert.equal(demo.checkupFrequency.everyYear, true);
});
