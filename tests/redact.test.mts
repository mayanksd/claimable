import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { redact } from "../src/lib/redact.ts";

test("first name is returned separately and masked everywhere in the text", () => {
  const r = redact("Policyholder: Mr ROHAN MEHTA\nMobile / Email 9876543210 / rohan.m@example.com\nMember Rohan Mehta 33 Self");
  assert.equal(r.firstName, "Rohan");
  assert.doesNotMatch(r.text, /rohan|mehta|9876543210/i);
});

test("no holder line → no first name", () => {
  assert.equal(redact("Benefits table\nOPD Rs. 5,000").firstName, null);
});

test("demo fixture: 15 details masked, name absent from the text sent to the model", () => {
  const demo = JSON.parse(readFileSync(new URL("../demo/redacted-policy.json", import.meta.url), "utf8"));
  assert.equal(demo.count, 15);
  assert.equal(demo.firstName, "Rohan");
  assert.doesNotMatch(demo.text, /rohan|mehta/i);
});
