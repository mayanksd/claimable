import { test } from "node:test";
import assert from "node:assert/strict";
import { fixPreExisting, pedWaitingMonths } from "../src/lib/preExisting.ts";

const item = (o: Record<string, unknown>) =>
  ({ id: "x", emoji: "", title: "", detail: "", status: "not_covered", coveredFrom: "", sourcePage: 1, ...o }) as any;

test("flattened PED table line: a listed condition is a waiting period, not 'not covered'", () => {
  const text =
    "[[PAGE 1]]\nInsured Name Relationship Age\nPre-Existing Disease Permanent Exclusion Loading Reason Waiting Period Start Date Diabetes Mellitus 16/12/2024";
  const [fixed] = fixPreExisting([item({ title: "Diabetes", detail: "Permanently excluded.", status: "not_covered" })], text);
  assert.equal(fixed.status, "waiting");
  assert.equal(fixed.detail, "Pre-existing — not covered in the first few years. Ask your insurer when cover starts.");
  assert.doesNotMatch(fixed.detail, /permanent/i);
});

test("stated PED waiting period is used in the copy", () => {
  const text = "Waiting periods\nPre-existing diseases 36 months\nPre-Existing Disease Diabetes Mellitus, Hypertension";
  assert.equal(pedWaitingMonths(text), 36);
  const out = fixPreExisting(
    [
      item({ title: "Hypertension (BP)", status: "not_covered" }),
      item({ title: "Conditions you had before buying (e.g. diabetes, BP)", status: "waiting", coveredFrom: "1 Jan 2029" }),
    ],
    text,
  );
  for (const o of out) {
    assert.equal(o.status, "waiting");
    assert.equal(o.detail, "Pre-existing — covered after 36 months. Check your start date with your insurer.");
  }
  assert.equal(out[1].coveredFrom, "1 Jan 2029", "keeps a computed date");
  assert.equal(pedWaitingMonths("Pre-existing diseases: 3 years"), 36);
});

test("a real, explicit permanent exclusion stays not covered", () => {
  const text = "Pre-Existing Disease Diabetes\nPermanent exclusion: Diabetes and its complications are permanently excluded under this policy.";
  const [fixed] = fixPreExisting([item({ title: "Diabetes", detail: "Permanently excluded.", status: "not_covered" })], text);
  assert.equal(fixed.status, "not_covered");
  assert.match(fixed.detail, /Permanently excluded/);
});

test("never says 'permanently' without the text saying so; unrelated items untouched", () => {
  const text = "Maternity Not covered\nKey exclusions: maternity and newborn expenses.";
  const out = fixPreExisting(
    [
      item({ title: "Maternity & delivery", detail: "Permanently excluded from this plan.", status: "not_covered" }),
      item({ title: "Gym discount", detail: "Up to 20% off.", status: "covered" }),
    ],
    text,
  );
  assert.equal(out[0].status, "not_covered");
  assert.equal(out[0].detail, "Excluded from this plan.");
  assert.deepEqual(out[1], item({ title: "Gym discount", detail: "Up to 20% off.", status: "covered" }));
});

import { readFileSync } from "node:fs";

test("sample policy: only the pre-existing item is rewritten; bariatric / maternity untouched", () => {
  const text: string = JSON.parse(readFileSync(new URL("../demo/redacted-policy.json", import.meta.url), "utf8")).text;
  const demo = JSON.parse(readFileSync(new URL("../demo/extraction.json", import.meta.url), "utf8"));
  const life = fixPreExisting(demo.lifestyle.items, text);
  const byId = Object.fromEntries(life.map((i: any) => [i.id, i]));
  assert.equal(byId.ped.detail, "Pre-existing — covered after 36 months. Check your start date with your insurer.");
  assert.equal(byId.ped.status, "waiting");
  assert.deepEqual(byId.bariatric, demo.lifestyle.items.find((i: any) => i.id === "bariatric"));
  assert.deepEqual(fixPreExisting(demo.family.items, text), demo.family.items);
});
