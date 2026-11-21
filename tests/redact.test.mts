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

import { findHolderName } from "../src/lib/redact.ts";

test("greeting name: only the holder/proposer/insured field, never nominee or table headers", () => {
  // The real-policy bug: a table header row after "Insured Name" produced "Nominee".
  assert.equal(redact("Insured Name Nominee Relationship Age\nRAJESH KUMAR Sunita Kumar Mother 54").firstName, null);
  assert.equal(redact("Proposer Name: Mr. RAJESH KUMAR\nNominee Name: SUNITA KUMAR").firstName, "Rajesh");
  assert.equal(redact("Name of the Policyholder: Smt. PRIYA NAIR").firstName, "Priya");
  assert.equal(redact("Policy holder's Name : Dr Arjun Rao").firstName, "Arjun");
  assert.equal(redact("Nominee Name: Kavya Rao\nAppointee: Ramesh Rao").firstName, null, "nominee/appointee never used");
  assert.equal(redact("Insured Person Name Relationship Self Male").firstName, null);
  for (const label of ["Nominee", "Self", "Proposer", "Insured", "Father", "Mother", "Spouse", "Name", "Policyholder"]) {
    assert.equal(redact(`Policyholder: ${label}`).firstName, null, label);
  }
  // Header row first, real value later: take the real one.
  assert.deepEqual(findHolderName("Insured Name Nominee Relationship\n...\nInsured Name: MEERA IYER"), ["MEERA", "IYER"]);
});

test("a bad name capture never masks ordinary words across the document", () => {
  const text = "Insured Name Nominee Relationship\nThe nominee must be informed. Nominee details can be changed. Relationship proof is required.";
  const r = redact(text);
  assert.equal(r.count, 0);
  assert.equal(r.text, text);
});

test("over-masking: limits, amounts, dates, helplines and insurer mailboxes survive", () => {
  const lines = [
    "Sum Insured Rs. 5,00,000 per policy year",
    "Policy Period: 01/04/2025 to 31/03/2026 (both days inclusive)",
    "Annual health check-up up to Rs. 25,000 once per policy year",
    "OPD Rs 5,000 | Dental Rs. 10,000 | Room rent 1% of SI per day",
    "Toll free: 1800 425 2255 / 1800 102 4477 | Senior citizens 1860 500 1234",
    "Claims: claims@starhealth.in | Grievance: grievances@hdfcergo.com | care@nivabupa.com",
    "Please quote the policy number mentioned in the schedule in all correspondence.",
    "Address for correspondence is given in the schedule. Registered Office Address: 1 Insurer Towers, Chennai 600001",
    "Premium Rs. 18,450 (incl. GST) | Co-payment 20% | Waiting period 24 months | UIN SHAHLIP23131V022223",
    "Cumulative bonus 50% of SI per claim-free year, maximum 100%",
  ].join("\n");
  const r = redact(lines);
  assert.equal(r.count, 0, `masked: ${r.kinds.join(", ")}\n${r.text}`);
  assert.equal(r.text, lines);
});

test("still masks the personal fields on a realistic schedule", () => {
  const schedule = [
    "Policy No. 11240034567800 Policy Period 01/04/2025 to 31/03/2026",
    "Proposer Name: Mr. RAJESH KUMAR",
    "Address: 14 Lake View Road, Kodambakkam, Chennai 600024",
    "Mobile 9840012345 Email rajesh.k77@gmail.com PAN ABCPK1234D",
    "Insured Name Relationship Age Nominee",
    "RAJESH KUMAR Self 52 Sunita Kumar (Wife)",
    "Toll free 1800 425 2255, claims@starhealth.in",
  ].join("\n");
  const r = redact(schedule);
  assert.doesNotMatch(r.text, /RAJESH|Rajesh|KUMAR|Kumar|9840012345|rajesh\.k77|ABCPK1234D|Lake View|11240034567800/);
  assert.match(r.text, /1800 425 2255/);
  assert.match(r.text, /claims@starhealth\.in/);
  assert.match(r.text, /01\/04\/2025 to 31\/03\/2026/);
  assert.equal(r.firstName, "Rajesh");
  assert.ok(r.count <= 10, `count ${r.count}`);
});
