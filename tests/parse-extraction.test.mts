import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractJsonText, parseExtraction, parseJsonLoose } from "../src/lib/parseExtraction.ts";
import { ExtractionModelSchema } from "../src/lib/modelSchema.ts";
import { SHAPE_EXAMPLE, buildExtractionSystem } from "../src/lib/extractionPrompt.ts";

const demo = JSON.parse(readFileSync(new URL("../demo/extraction.json", import.meta.url), "utf8"));
const ok = (r: ReturnType<typeof parseExtraction>) => {
  assert.ok(r.ok, JSON.stringify(!r.ok && r.issues));
  return r as Extract<typeof r, { ok: true }>;
};

test("finds the JSON in fences and surrounding prose", () => {
  assert.equal(extractJsonText('```json\n{"a":1}\n```'), '{"a":1}');
  assert.equal(extractJsonText('Sure! Here it is: {"a":{"b":2}} Let me know.'), '{"a":{"b":2}}');
  assert.equal(extractJsonText("no json here"), null);
});

test("repairs trailing commas and smart quotes once", () => {
  const r = parseJsonLoose('{"a": [1, 2,], "b": {"c": 3,},}');
  assert.ok(r.ok && r.repaired);
  assert.deepEqual(r.ok && r.value, { a: [1, 2], b: { c: 3 } });
  const q = parseJsonLoose("{“a”: 1}");
  assert.ok(q.ok && q.repaired);
});

test("fenced answer with trailing text and trailing commas parses", () => {
  const body = JSON.stringify(SHAPE_EXAMPLE, null, 1).replace(/\n\s*\]/g, ",\n]");
  const r = ok(parseExtraction("```json\n" + body + "\n```\n\nThat's everything in your policy."));
  assert.equal(r.repaired, true);
  assert.equal(r.data.perks.length, 2);
});

test("missing sections and fields are filled with defaults, not failures", () => {
  const r = ok(parseExtraction(JSON.stringify({
    policy: { insurer: "X", product: "Y", sumInsuredInr: 500000 },
    perks: [{ id: "opd", name: "Doctor visits", category: "use_now", capLabel: "₹5,000", frequency: "per_year", sourcePage: 2 }],
  })));
  assert.equal(r.data.documentType, "retail_health");
  assert.equal(r.data.policy.annualPremiumInr, 0);
  assert.equal(r.data.policy.startDate, "");
  assert.equal(r.data.perks[0].claimMode, "unknown");
  assert.equal(r.data.perks[0].emoji, "✨");
  assert.deepEqual(r.data.redFlags, []);
  assert.deepEqual(r.data.family, { items: [], notMentioned: [] });
  assert.equal(r.data.rewards, null);
  assert.deepEqual(r.data.checkupFrequency, { label: "", everyYear: false, sourcePage: 0 });
});

test("enum casing and numeric strings are fixed; nulls in sentinel fields accepted", () => {
  const m = structuredClone(SHAPE_EXAMPLE) as any;
  m.perks[0].claimMode = "Cashless";
  m.perks[0].category = "Use now";
  m.perks[0].capInr = "₹10,000";
  m.perks[0].sourcePage = "2";
  m.redFlags[0].severity = "HIGH";
  m.policy.startDate = null;
  m.lifestyle.items[0].coveredFrom = null;
  m.checkupFrequency = null;
  const r = ok(parseExtraction(JSON.stringify(m)));
  assert.equal(r.data.perks[0].claimMode, "cashless");
  assert.equal(r.data.perks[0].category, "use_now");
  assert.equal(r.data.perks[0].capInr, 10000);
  assert.equal(r.data.perks[0].sourcePage, 2);
  assert.equal(r.data.redFlags[0].severity, "high");
  assert.equal(r.data.policy.startDate, "");
  assert.equal(r.data.lifestyle.items[0].coveredFrom, "");
  assert.equal(r.data.checkupFrequency.label, "");
});

test("only broken list items are dropped (e.g. no sourcePage, unknown enum)", () => {
  const m = structuredClone(SHAPE_EXAMPLE) as any;
  delete m.perks[0].sourcePage;
  m.redFlags.push({ id: "x", title: "Bad", why: "", severity: "catastrophic", sourcePage: 3 });
  const r = ok(parseExtraction(JSON.stringify(m)));
  assert.deepEqual(r.data.perks.map((p) => p.id), ["teleconsult"]);
  assert.equal(r.data.redFlags.length, 1);
  assert.deepEqual(r.dropped.sort(), ["perks[0]", "redFlags[1]"]);
});

test("a malformed rewards block becomes null instead of failing", () => {
  const m = structuredClone(SHAPE_EXAMPLE) as any;
  m.rewards.coinBalance = "lots";
  const r = ok(parseExtraction(JSON.stringify(m)));
  assert.equal(r.data.rewards, null);
});

test("unusable answers return readable issues for the retry", () => {
  const none = parseExtraction("I'm sorry, I can't read this document.");
  assert.ok(!none.ok && /No JSON object/.test(none.issues[0]));
  const bad = parseExtraction('{"perks": [ {"id": 1 ');
  assert.ok(!bad.ok);
  const wrongType = parseExtraction('{"policy": {"insurer": "X", "product": "Y", "sumInsuredInr": "a lot"}}');
  assert.ok(!wrongType.ok && wrongType.issues.some((i) => i.startsWith("policy.sumInsuredInr")), JSON.stringify(wrongType));
});

test("the demo extraction (with nulls) parses as a model answer", () => {
  const r = ok(parseExtraction(JSON.stringify(demo)));
  assert.equal(r.data.perks.length, demo.perks.length);
  assert.deepEqual(r.dropped, []);
});

test("prompt: example is schema-valid; rules list the enums", () => {
  assert.ok(ExtractionModelSchema.safeParse(SHAPE_EXAMPLE).success);
  const sys = buildExtractionSystem("BASE");
  assert.ok(sys.startsWith("BASE\n\n"));
  assert.match(sys, /Return ONLY a single JSON object matching this shape/);
  assert.match(sys, /claimMode: cashless \| reimbursement \| in_app \| free \| unknown/);
  assert.ok(!sys.includes("```"), "no markdown fences in the prompt");
  assert.ok(sys.includes(JSON.stringify(SHAPE_EXAMPLE)));
});

import { PART_KEYS, buildPartSystem } from "../src/lib/extractionPrompt.ts";
import { PART_B_PLACEHOLDER, PartASchema, PartBSchema, mergeParts } from "../src/lib/modelSchema.ts";
import { parseWith } from "../src/lib/parseExtraction.ts";
import { ExtractionSchema } from "../src/lib/schema.ts";

const demoModel = () => {
  const d = ExtractionSchema.parse(demo);
  return {
    ...d,
    policy: { ...d.policy, startDate: d.policy.startDate ?? "" },
    optionalCovers: [],
    family: { ...d.family, items: d.family.items.map((i) => ({ ...i, coveredFrom: i.coveredFrom ?? "" })) },
    lifestyle: { ...d.lifestyle, items: d.lifestyle.items.map((i) => ({ ...i, coveredFrom: i.coveredFrom ?? "" })) },
    checkupFrequency: d.checkupFrequency ?? { label: "", everyYear: false, sourcePage: 0 },
  };
};
const pick = (o: Record<string, unknown>, keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, o[k]]));

test("split: parts A and B parse separately and merge back to demo/extraction.json", () => {
  const m = demoModel();
  const a = parseWith("```json\n" + JSON.stringify(pick(m, PART_KEYS.A)) + "\n```", PartASchema);
  const b = parseWith(JSON.stringify(pick(m, PART_KEYS.B)) + "\nDone.", PartBSchema);
  assert.ok(a.ok && b.ok);
  assert.deepEqual(mergeParts(a.data, b.data), ExtractionSchema.parse(demo));
  assert.deepEqual(Object.keys(a.data).sort(), [...PART_KEYS.A].sort(), "part A keeps only its keys");
});

test("split: dashboard can open on part A alone (B placeholder is empty, not invented)", () => {
  const m = demoModel();
  const a = parseWith(JSON.stringify(pick(m, PART_KEYS.A)), PartASchema);
  assert.ok(a.ok);
  const e = mergeParts(a.data, null);
  assert.equal(e.perks.length, demo.perks.length);
  assert.deepEqual(e.redFlags, []);
  assert.deepEqual(e.family.items, []);
  assert.equal(e.checkupFrequency, null);
  assert.ok(PartBSchema.safeParse(PART_B_PLACEHOLDER).success);
});

test("split: each part's prompt shows only its own keys", () => {
  const shapeOf = (sys: string) => JSON.parse(sys.slice(sys.lastIndexOf("Shape:\n") + 7));
  assert.deepEqual(Object.keys(shapeOf(buildPartSystem("BASE", "A"))), [...PART_KEYS.A]);
  assert.deepEqual(Object.keys(shapeOf(buildPartSystem("BASE", "B"))), [...PART_KEYS.B]);
  assert.match(buildPartSystem("BASE", "B"), /This request covers only these keys: documentType, redFlags/);
  assert.deepEqual([...PART_KEYS.A, ...PART_KEYS.B].sort(), Object.keys(SHAPE_EXAMPLE).sort(), "A + B cover every key");
});
