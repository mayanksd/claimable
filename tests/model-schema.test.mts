import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync } from "node:fs";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { normalizeExtraction, type ExtractionModelOutput } from "../src/lib/modelSchema.ts";
import { ExtractionSchema } from "../src/lib/schema.ts";
import { parseExtraction } from "../src/lib/parseExtraction.ts";
import { buildExtractionSystem } from "../src/lib/extractionPrompt.ts";

const demo = ExtractionSchema.parse(JSON.parse(readFileSync(new URL("../demo/extraction.json", import.meta.url), "utf8")));

/** The demo extraction as the model returns it (sentinels instead of nulls in the newer fields). */
export const demoAsModelOutput = (): ExtractionModelOutput => ({
  ...demo,
  policy: { ...demo.policy, startDate: demo.policy.startDate ?? "" },
  optionalCovers: [],
  family: { ...demo.family, items: demo.family.items.map((i) => ({ ...i, coveredFrom: i.coveredFrom ?? "" })) },
  lifestyle: { ...demo.lifestyle, items: demo.lifestyle.items.map((i) => ({ ...i, coveredFrom: i.coveredFrom ?? "" })) },
  checkupFrequency: demo.checkupFrequency ?? { label: "", everyYear: false, sourcePage: 0 },
});

/** generateText against a local stand-in for the Messages API that replies with `replyText`. */
async function callMock(replyText: string) {
  let body: any;
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      body = JSON.parse(raw);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        id: "msg_test", type: "message", role: "assistant", model: body.model,
        content: [{ type: "text", text: replyText }],
        stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
      }));
    });
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  const anthropic = createAnthropic({ baseURL: `http://127.0.0.1:${port}/v1`, apiKey: "test" });
  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-5-5"),
      system: buildExtractionSystem("You read a health insurance policy."),
      prompt: "[[PAGE 1]] …",
      maxOutputTokens: 16000,
      maxRetries: 0,
    });
    return { body, text };
  } finally {
    server.close();
  }
}

test("extraction request uses no structured outputs / strict grammar", async () => {
  const { body } = await callMock("{}");
  assert.equal(body.output_config?.format, undefined, "no output_config.format");
  assert.equal(body.tools, undefined, "no tools");
  assert.equal(body.max_tokens, 16000);
  const system = typeof body.system === "string" ? body.system : body.system.map((b: { text: string }) => b.text).join("");
  assert.match(system, /Return ONLY a single JSON object matching this shape/);
});

test("mock round trip: fenced JSON answer → parse → normalize equals demo/extraction.json", async () => {
  const { text } = await callMock("Here you go:\n```json\n" + JSON.stringify(demoAsModelOutput(), null, 2) + "\n```\nHope this helps!");
  const parsed = parseExtraction(text);
  assert.ok(parsed.ok, JSON.stringify(!parsed.ok && parsed.issues));
  assert.deepEqual(parsed.dropped, []);
  assert.deepEqual(normalizeExtraction(parsed.data), demo);
});

test("sentinels map back to nulls", () => {
  const m = demoAsModelOutput();
  m.policy.startDate = "";
  m.checkupFrequency = { label: "", everyYear: false, sourcePage: 0 };
  m.lifestyle.items[0].coveredFrom = " ";
  m.optionalCovers = [{ id: "oc", emoji: "🌍", name: "Global cover", capLabel: "Add-on", oneLiner: "Abroad, if bought.", sourcePage: 5 }];
  const e = normalizeExtraction(m);
  assert.equal(e.policy.startDate, null);
  assert.equal(e.checkupFrequency, null);
  assert.equal(e.lifestyle.items[0].coveredFrom, null);
  assert.equal(e.optionalCovers[0].capInr, null);
  assert.equal(e.optionalCovers[0].claimMode, "unknown");
});
