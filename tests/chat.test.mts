import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAX_CHECKUP_CHIP, withCheckupChip } from "../src/lib/chat.ts";
import { parseAnswer } from "../src/lib/answer.ts";

test("check-up answer without the chip gets it first, still max 3", () => {
  assert.deepEqual(withCheckupChip("Free health check-up?", "One check-up a year.", ["A?", "B?", "C?"]), [MAX_CHECKUP_CHIP, "A?", "B?"]);
});

test("mention in the answer counts too; unrelated answers are untouched", () => {
  assert.deepEqual(withCheckupChip("What's free?", "Your annual checkup is cashless.", ["A?"]), [MAX_CHECKUP_CHIP, "A?"]);
  assert.deepEqual(withCheckupChip("Emergency number?", "Call 1800 000 1234.", ["A?", "B?"]), ["A?", "B?"]);
  assert.deepEqual(withCheckupChip("Are dental check-ups covered?", "Yes, under OPD dental.", ["A?"]), ["A?"]);
});

test("no duplicate, and not suggested right after asking it", () => {
  assert.deepEqual(withCheckupChip("Free health check-up?", "", ["how do I max my check-up?", "B?"]), ["how do I max my check-up?", "B?"]);
  assert.deepEqual(withCheckupChip(MAX_CHECKUP_CHIP, "check-up limit", ["B?"]), ["B?"]);
});

test("every cached check-up answer already offers the max chip", () => {
  const cached: Record<string, string> = JSON.parse(readFileSync(new URL("../demo/cached-answers.json", import.meta.url), "utf8"));
  for (const [q, text] of Object.entries(cached)) {
    const a = parseAnswer(text);
    if (q === MAX_CHECKUP_CHIP || !/check-?\s?up/i.test(q + a.body)) continue;
    assert.ok(a.followups.includes(MAX_CHECKUP_CHIP), q);
  }
});
