import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseAnswer } from "../src/lib/answer.ts";

const cached: Record<string, string> = JSON.parse(readFileSync(new URL("../demo/cached-answers.json", import.meta.url), "utf8"));
const STARTERS = ["Emergency number?", "Tooth extraction covered?", "Free health check-up?"];

test("starter chips all have cached answers", () => {
  for (const q of STARTERS) assert.ok(cached[q], q);
});

test("every cached answer is concise, cited, and its follow-ups are answerable in demo mode", () => {
  for (const [q, text] of Object.entries(cached)) {
    const a = parseAnswer(text);
    const words = a.body.replace(/\*\*/g, "").split(/\s+/).length;
    assert.ok(words <= 32, `${q}: ${words} words`);
    assert.match(a.source ?? "", /^Source: p\.\d+(, p\.\d+)*$/, q);
    assert.ok(a.followups.length >= 2 && a.followups.length <= 3, `${q}: ${a.followups.length} follow-ups`);
    for (const f of a.followups) {
      assert.ok(f.split(/\s+/).length < 7, `${q} → "${f}" is too long`);
      assert.ok(cached[f], `${q} → follow-up "${f}" has no cached answer`);
    }
  }
});
