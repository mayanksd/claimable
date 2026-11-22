import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readProfile } from "../src/lib/profile.ts";
import { redact } from "../src/lib/redact.ts";

const day = (s: string) => new Date(s + "T00:00:00Z");

test("age from DOB (not the printed age) and gender from the member row", () => {
  const row = "AGI-M-551902 ROHAN MEHTA 14/03/1992 33 Male Self Rs. 30,00,000 Sunita Mehta (Mother)";
  assert.deepEqual(readProfile(row, day("2026-11-22")), { age: 34, ageBand: "25to34", gender: "male" });
  assert.equal(readProfile(row, day("2027-03-13")).age, 34);
  assert.equal(readProfile(row, day("2027-03-14")).age, 35);
  assert.equal(readProfile(row, day("2027-03-14")).ageBand, "35to44");
});

test("labelled fields; unknowns stay unknown", () => {
  assert.deepEqual(readProfile("Date of Birth: 02/11/1975\nGender: Female", day("2026-11-22")), { age: 51, ageBand: "45plus", gender: "female" });
  assert.deepEqual(readProfile("Sum Insured Rs. 5,00,000", day("2026-11-22")), { age: null, ageBand: null, gender: "unspecified" });
  // Policy period dates aren't a DOB.
  assert.equal(readProfile("Policy period 01/01/2026 00:00 hrs to 31/12/2028", day("2026-11-22")).age, null);
});

test("sample policy: DOB and member row are masked; policy dates survive", () => {
  const text: string = JSON.parse(readFileSync(new URL("../demo/redacted-policy.json", import.meta.url), "utf8")).text;
  assert.doesNotMatch(text, /14\/03\/1992/);
  assert.match(text, /01\/01\/2026/);
  const r = redact("Member ID Name DOB Age Gender Relationship\nAGI-M-551902 ROHAN MEHTA 14/03/1992 33 Male Self\nDOB: 05/06/1988");
  assert.doesNotMatch(r.text, /14\/03\/1992|05\/06\/1988/);
});
