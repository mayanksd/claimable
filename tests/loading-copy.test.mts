import { test } from "node:test";
import assert from "node:assert/strict";
import { FUN_FACTS, HEADLINES, LOOP_HEADLINES, factAt, headlineAt } from "../src/lib/loadingCopy.ts";

test("headlines play in order once, then loop the extra lines", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((n) => headlineAt(n).text), HEADLINES.map((h) => h.text));
  assert.equal(headlineAt(0).text, "Analyzing your policy…");
  assert.equal(headlineAt(5).text, "Almost there — polishing your results");
  assert.equal(headlineAt(6).text, "Digging into the fine print");
  assert.equal(headlineAt(7).text, "Big policy — lots of perks to find");
  assert.equal(headlineAt(8).text, "Checking every page for you");
  assert.equal(headlineAt(9).text, "Digging into the fine print");
  assert.equal(headlineAt(600).emoji, LOOP_HEADLINES[(600 - 6) % 3].emoji);
});

test("no time estimates or apologies in any loading copy", () => {
  const all = [...HEADLINES, ...LOOP_HEADLINES].map((h) => h.text).concat(FUN_FACTS).join(" ");
  assert.doesNotMatch(all, /\b(second|seconds|minute|minutes|sorry|apolog|wait|slow)\b/i);
});

test("fun facts rotate through all four", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(factAt), [...FUN_FACTS, FUN_FACTS[0]]);
});
