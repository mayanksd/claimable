import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import { ExtractionSchema } from "../src/lib/schema.ts";
import { redact } from "../src/lib/redact.ts";
import { readProfile } from "../src/lib/profile.ts";
import { readCheckupRules } from "../src/lib/agent/rules.ts";
import { ageGroupTests, checkCoverage, fitPlan, shortlist } from "../src/lib/agent/plan.ts";
import { applyLivePrices } from "../src/lib/agent/prices.ts";
import { lookupIds } from "../src/lib/agent/steps.ts";
import { PROVIDERS } from "../src/data/providers.ts";
import type { About, FocusId } from "../src/lib/agent/types.ts";

const PERSONAS = {
  arjun: { dob: ["02/02/1999", "1999"], age: 27, gender: "male" },
  priya: { dob: ["18/06/1995", "1995"], age: 31, gender: "female" },
} as const;
const json = (f: string) => JSON.parse(readFileSync(f, "utf8"));
const TODAY = new Date(Date.UTC(2026, 10, 22));

async function pdfText(path: string) {
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(path)));
  const { text } = await extractText(pdf, { mergePages: false });
  return (text as string[]).map((t, i) => `[[PAGE ${i + 1}]]\n${t.trim()}`).join("\n\n");
}

function planFor(id: keyof typeof PERSONAS, focus: FocusId[]) {
  const e = ExtractionSchema.parse(json(`demo/extraction-${id}.json`));
  const fx = json(`demo/redacted-${id}.json`);
  const rules = readCheckupRules(e, fx.text);
  const a: About = { ageBand: fx.profile.ageBand, age: fx.profile.age, gender: fx.profile.gender, focus };
  const s = shortlist(a);
  const checked = applyLivePrices([...s.heroes, ...s.supporting, ...s.tests, ...s.genetic], []).map((p) => checkCoverage(p, rules));
  return { rules, s, checked, plan: fitPlan(checked, rules.limitInr, a) };
}

for (const [id, p] of Object.entries(PERSONAS)) {
  test(`${id}: PDF → profile from the DOB, DOB masked before the model`, async () => {
    const raw = await pdfText(`demo/sample-${id}.pdf`);
    assert.ok(raw.includes(p.dob[0]), "the PDF does carry a DOB");
    const prof = readProfile(raw, TODAY);
    assert.deepEqual(prof, { age: p.age, ageBand: "25to34", gender: p.gender });
    assert.deepEqual(Object.keys(prof).sort(), ["age", "ageBand", "gender"], "no DOB field goes to the browser");
    const masked = redact(raw).text;
    for (const d of p.dob) assert.ok(!masked.includes(d), `model text has no ${d}`);
  });

  test(`${id}: demo fixtures hold no DOB (browser + model)`, () => {
    for (const f of [`demo/redacted-${id}.json`, `demo/extraction-${id}.json`, `demo/cached-answers-${id}.json`]) {
      const t = readFileSync(f, "utf8");
      for (const d of p.dob) assert.ok(!t.includes(d), `${f} has no ${d}`);
    }
    assert.equal(json(`demo/redacted-${id}.json`).profile.gender, p.gender);
  });

  test(`${id}: Heart + Genetic plan is valid and within ₹30,000`, () => {
    const { plan, rules, checked } = planFor(id as keyof typeof PERSONAS, ["heart", "genetic"]);
    assert.equal(rules.limitInr, 30000);
    assert.ok(plan.items.length > 0);
    assert.ok(plan.totalInr <= 30000);
    assert.ok(plan.items.every((x) => x.coverage === "covered" && x.cityConfirmed));
    assert.ok(!plan.items.some((x) => x.id === "supprx-ultra"));
    assert.equal(checked.find((x) => x.category === "genetic")?.coverage, "prescription");
  });
}

test("plans differ by body: men's vs women's panel", () => {
  const a = planFor("arjun", ["heart", "genetic"]).plan.items.map((x) => x.id);
  const p = planFor("priya", ["heart", "genetic"]).plan.items.map((x) => x.id);
  assert.notDeepEqual(a, p);
  assert.ok(a.includes("mens-panel") && !a.includes("womens-panel"));
  assert.ok(p.includes("womens-panel") && !p.includes("mens-panel"));
});

test("plans differ by age: mammogram only from 40, PSA only from 50", () => {
  const tests = (age: number, gender: "male" | "female", band: About["ageBand"]) =>
    Object.fromEntries(ageGroupTests({ age, ageBand: band, gender, focus: [] }).map((t) => [t.test.id, t.status]));
  assert.equal(tests(31, "female", "25to34").mammogram, "later");
  assert.equal(tests(46, "female", "45plus").mammogram, "included");
  assert.equal(tests(27, "male", "25to34").psa, "later");
  assert.equal(tests(52, "male", "45plus").psa, "included");
  assert.equal(tests(31, "female", "25to34").psa, undefined, "no men's tests for women");
});

test("Supp[Rx] isn't confirmed for Bengaluru, so it's never shortlisted or looked up", () => {
  const supprx = PROVIDERS.find((x) => x.id === "supprx-ultra")!;
  assert.equal(supprx.cityConfirmed, false);
  for (const focus of [["hormones"], ["heart"], []] as FocusId[][]) {
    const s = shortlist({ ageBand: "25to34", gender: "female", focus });
    assert.ok(![...s.heroes, ...s.supporting, ...s.tests].some((x) => x.id === "supprx-ultra"));
    assert.ok(!lookupIds(s).includes("supprx-ultra"));
  }
});

test("the live price lookup sends provider ids only, nothing about the person", () => {
  const s = shortlist({ ageBand: "25to34", age: 31, gender: "female", focus: ["heart"] });
  const ids = lookupIds(s);
  assert.ok(ids.length <= 3);
  assert.ok(ids.every((i) => PROVIDERS.some((x) => x.id === i)));
});
