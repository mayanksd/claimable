import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ExtractionSchema } from "../src/lib/schema.ts";
import { readCheckupRules } from "../src/lib/agent/rules.ts";
import { checkCoverage, fitPlan, shortlist } from "../src/lib/agent/plan.ts";
import { applyLivePrices } from "../src/lib/agent/prices.ts";
import { stepShortlist } from "../src/lib/agent/steps.ts";
import { FOCUS, type About, type FocusId } from "../src/lib/agent/types.ts";

const json = (f: string) => JSON.parse(readFileSync(f, "utf8"));
const PEOPLE = {
  arjun: { age: 27, ageBand: "25to34", gender: "male" },
  priya: { age: 31, ageBand: "25to34", gender: "female" },
} as const;

function plan(who: keyof typeof PEOPLE, focus: FocusId[], limit?: number) {
  const e = ExtractionSchema.parse(json(`demo/extraction-${who}.json`));
  const rules = readCheckupRules(e, json(`demo/redacted-${who}.json`).text);
  const a: About = { ...PEOPLE[who], focus };
  const s = shortlist(a);
  const checked = applyLivePrices([...s.heroes, ...s.supporting, ...s.tests, ...s.genetic], []).map((p) => checkCoverage(p, rules));
  return fitPlan(checked, limit ?? rules.limitInr, a);
}
const ids = (p: ReturnType<typeof plan>) => p.items.map((x) => x.id);

for (const who of ["arjun", "priya"] as const) {
  test(`${who}: each focus gets its own pick`, () => {
    assert.deepEqual(ids(plan(who, ["longevity"])), ["uh-pro"]);
    assert.deepEqual(ids(plan(who, ["sugar"])).sort(), ["dh-baseline", "nura-ai"]);
    const heart = ids(plan(who, ["heart"]));
    assert.equal(heart[0], "cent-fullbody");
    assert.ok(heart.includes(who === "arjun" ? "mens-panel" : "womens-panel"), "heart adds the age/body panel");
    for (const f of ["hormones", "gut"] as const) {
      const p = ids(plan(who, [f]));
      assert.ok(p.includes("dh-baseline") && p.includes("tata1mg-gold"), `${f}: Deep Holistics + standard full body`);
      assert.ok(p.some((id) => ["thyroid-antibodies", "celiac-screen", "iron-studies", "womens-panel", "mens-panel"].includes(id)), `${f}: relevant markers`);
    }
  });

  test(`${who}: different focuses → different plans`, () => {
    const plans = (["heart", "longevity", "sugar", "hormones", "gut"] as const).map((f) => ids(plan(who, [f])).sort().join(","));
    assert.equal(new Set(plans).size, plans.length, plans.join(" | "));
  });

  test(`${who}: every focus and pair stays ≤ ₹30,000, one premium screening, no duplicate packages`, () => {
    const fs = FOCUS.map((f) => f.id);
    const combos: FocusId[][] = [[], ...fs.map((f) => [f]), ...fs.flatMap((a, i) => fs.slice(i + 1).map((b) => [a, b]))];
    for (const c of combos) {
      for (const limit of [30000, 12000, 3000]) {
        const p = plan(who, c, limit);
        assert.ok(p.totalInr <= limit, `${c} @${limit}: ${p.totalInr}`);
        assert.ok(p.items.filter((x) => x.category === "hero").length <= 1);
        assert.equal(new Set(ids(p)).size, p.items.length);
        assert.ok(!ids(p).includes("supprx-ultra"));
      }
      assert.ok(plan(who, c).totalInr >= 15000, `${c} uses the free benefit`);
    }
  });
}

test("two focuses combine: heart + sugar keeps Cent and adds the sugar markers", () => {
  const p = ids(plan("arjun", ["heart", "sugar"]));
  assert.ok(p.includes("cent-fullbody") && p.includes("insulin-panel") && p.includes("heart-markers"));
});

test("step 3 explains the pick for the focus in one line", () => {
  const why = stepShortlist({ ...PEOPLE.priya, focus: ["longevity"] }).result.why;
  assert.ok(why.some((l) => /^Why this pick: Longevity → Ultrahuman Performance Lab Pro/.test(l)));
});
