import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseAnswer } from "../src/lib/answer.ts";

const cached: Record<string, string> = JSON.parse(readFileSync(new URL("../demo/cached-answers.json", import.meta.url), "utf8"));
const STARTERS = ["Emergency number?", "Tooth extraction covered?", "Free health check-up?"];

test("emergency answer is only the emergency number; follow-ups stay on contacts", () => {
  const a = parseAnswer(cached["Emergency number?"]);
  assert.equal(a.verdict, null);
  assert.equal(a.body, "Call **1800 000 1234**, 24×7. Inform them within 24 hours of admission.");
  assert.doesNotMatch(a.body, /air ambulance|9111/i);
  assert.deepEqual(a.followups, ["Air ambulance number?", "Senior citizen helpline?", "Claims email?"]);
});

test("every number or email in a cached answer is in the policy's contacts list", () => {
  const extraction = JSON.parse(readFileSync(new URL("../demo/extraction.json", import.meta.url), "utf8"));
  const known = new Set<string>(extraction.contacts.map((c: { value: string }) => c.value));
  for (const [q, text] of Object.entries(cached)) {
    for (const m of text.matchAll(/1800 \d{3} \d{4}|[\w.+-]+@[\w.-]+\w/g)) assert.ok(known.has(m[0]), `${q}: ${m[0]}`);
  }
});

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
      assert.ok(f.split(/\s+/).length <= 7, `${q} → "${f}" is too long`);
      assert.ok(cached[f], `${q} → follow-up "${f}" has no cached answer`);
    }
  }
});

test("every use-now perk in the sample has a cached 'How do I claim' answer", () => {
  const extraction = JSON.parse(readFileSync(new URL("../demo/extraction.json", import.meta.url), "utf8"));
  for (const p of extraction.perks.filter((x: { category: string }) => x.category === "use_now")) {
    assert.ok(cached[`How do I claim: ${p.name}?`], p.name);
  }
});
