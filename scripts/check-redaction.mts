// Local check: extract a policy PDF like /api/analyze does and print what redact() masks.
// Usage: npm run check:redact [-- path/to.pdf]
import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import { redact } from "../src/lib/redact.ts";
import { readProfile } from "../src/lib/profile.ts";
const pdf = await getDocumentProxy(new Uint8Array(readFileSync(process.argv[2] ?? "demo/aarogya-policy.pdf")));
const { totalPages, text } = await extractText(pdf, { mergePages: false });
const marked = (text as string[]).map((t, i) => `[[PAGE ${i + 1}]]\n${t.trim()}`).join("\n\n");
const r = redact(marked);
console.log("pages", totalPages, "chars", marked.length, "redactions", r.count, r.kinds);
if (process.env.FULL) console.log(r.text); else console.log(r.text.slice(0, 1500));
console.log("helpline kept:", r.text.includes("1800 000 1234"), "claims email kept:", r.text.includes("claims@aarogya-example.in"));
// OUT=demo/redacted-policy.json writes the demo-mode fixture (redacted text + counts).
if (process.env.OUT) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.env.OUT, JSON.stringify({ text: r.text, count: r.count, kinds: r.kinds, firstName: r.firstName, profile: readProfile(marked, new Date()) }, null, 2) + "\n");
  console.log("wrote", process.env.OUT);
}
