import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAnswer } from "../src/lib/answer.ts";

test("emergency answer: no verdict pill when line 1 isn't exactly a label (the bug)", () => {
  // Shape of the answer that showed a NOT IN YOUR DOCUMENTS pill over a body that said COVERED:
  // the old parser accepted any first line that merely *started* with a label.
  const text = [
    "NOT IN YOUR DOCUMENTS whether your nearest hospital is in the network, but emergencies are COVERED.",
    "- Call the 24x7 helpline **1800 000 1234** within **24 hours** of an emergency admission.",
    "Source: page 3",
  ].join("\n");
  const a = parseAnswer(text);
  assert.equal(a.verdict, null);
  assert.match(a.body, /^NOT IN YOUR DOCUMENTS whether/);
  assert.equal(a.source, "Source: page 3");
});

test("emergency answer in the new style: info question, no verdict, follow-ups split out", () => {
  const a = parseAnswer(
    "Call **1800 000 1234** (24×7). Tell them within 24 hours of an emergency admission.\nSource: p.3\nFOLLOWUPS: Air ambulance number? | Teleconsult for a minor issue? | Is my hospital cashless?",
  );
  assert.equal(a.verdict, null);
  assert.equal(a.body, "Call **1800 000 1234** (24×7). Tell them within 24 hours of an emergency admission.");
  assert.equal(a.source, "Source: p.3");
  assert.deepEqual(a.followups, ["Air ambulance number?", "Teleconsult for a minor issue?", "Is my hospital cashless?"]);
});

test("verdict read from the first non-empty line, markdown stripped", () => {
  for (const [line, verdict] of [
    ["COVERED", "COVERED"],
    ["**PARTLY COVERED**", "PARTLY COVERED"],
    ["  `NOT COVERED`  ", "NOT COVERED"],
    ["## NOT IN YOUR DOCUMENTS", "NOT IN YOUR DOCUMENTS"],
  ] as const) {
    const a = parseAnswer(`\n${line}\nUp to **₹10,000 a year**.\nSource: p.2`);
    assert.equal(a.verdict, verdict, line);
    assert.equal(a.body, "Up to **₹10,000 a year**.");
  }
});

test("near-misses get no pill", () => {
  for (const line of ["COVERED.", "Covered", "COVERED up to ₹10,000", "Verdict: COVERED", "PARTLY"]) {
    assert.equal(parseAnswer(`${line}\nbody`).verdict, null, line);
  }
});

test("FOLLOWUPS: tolerant of markdown, quotes, spacing; max 3; removed from body", () => {
  const a = parseAnswer('COVERED\nYes.\nSource: p.2\n**FOLLOWUPS:** "A?" |  B? | <C?> | D?\n');
  assert.deepEqual(a.followups, ["A?", "B?", "C?"]);
  assert.equal(a.body, "Yes.");
  assert.equal(a.source, "Source: p.2");
});

test("streaming: half-written FOLLOWUPS line is hidden", () => {
  const a = parseAnswer("Call **1800 000 1234**.\nSource: p.3\nFOLLO", { partial: true });
  assert.equal(a.body, "Call **1800 000 1234**.");
  assert.equal(a.source, "Source: p.3");
  assert.deepEqual(a.followups, []);
});
