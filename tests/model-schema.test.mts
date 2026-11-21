import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync } from "node:fs";
import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { ZodTypeAny } from "zod";
import { ExtractionModelSchema, normalizeExtraction, type ExtractionModelOutput } from "../src/lib/modelSchema.ts";
import { ExtractionSchema } from "../src/lib/schema.ts";

const demo = ExtractionSchema.parse(JSON.parse(readFileSync(new URL("../demo/extraction.json", import.meta.url), "utf8")));

/** The demo extraction as the model would return it under ExtractionModelSchema (sentinels, no nulls in new fields). */
const demoAsModelOutput = (): ExtractionModelOutput => ({
  ...demo,
  policy: { ...demo.policy, startDate: demo.policy.startDate ?? "" },
  optionalCovers: [],
  family: { ...demo.family, items: demo.family.items.map((i) => ({ ...i, coveredFrom: i.coveredFrom ?? "" })) },
  lifestyle: { ...demo.lifestyle, items: demo.lifestyle.items.map((i) => ({ ...i, coveredFrom: i.coveredFrom ?? "" })) },
  checkupFrequency: demo.checkupFrequency ?? { label: "", everyYear: false, sourcePage: 0 },
});

/** Runs generateObject against a local stand-in for the Messages API; returns the request body it sent. */
async function capture(schema: ZodTypeAny, replyJson: unknown = {}) {
  let body: any;
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      body = JSON.parse(raw);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "msg_test", type: "message", role: "assistant", model: body.model,
          content: [{ type: "text", text: JSON.stringify(replyJson) }],
          stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
        }),
      );
    });
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  const anthropic = createAnthropic({ baseURL: `http://127.0.0.1:${port}/v1`, apiKey: "test" });
  let object: unknown, error: unknown;
  try {
    ({ object } = await generateObject({ model: anthropic("claude-sonnet-5-5"), schema, prompt: "x", maxRetries: 0 }));
  } catch (e) {
    error = e;
  } finally {
    server.close();
  }
  return { body, object, error };
}

function complexity(schema: any) {
  let optional = 0, unions = 0, defaults = 0;
  const problems: string[] = [];
  (function walk(o: any, path: string) {
    if (Array.isArray(o)) return o.forEach((x, i) => walk(x, `${path}[${i}]`));
    if (!o || typeof o !== "object") return;
    if (o.type === "object" && o.properties) {
      optional += Object.keys(o.properties).filter((k) => !(o.required ?? []).includes(k)).length;
      if (o.additionalProperties !== false) problems.push(`additionalProperties at ${path}`);
    }
    if (Array.isArray(o.type) || o.anyOf) unions++;
    if (o.anyOf && (o.type || o.properties)) problems.push(`anyOf with type at ${path}`);
    if ("default" in o) defaults++;
    for (const [k, v] of Object.entries(o)) walk(v, k === "properties" ? path : `${path}.${k}`);
  })(schema, "$");
  return { optional, unions, defaults, problems };
}

test("schema sent to Claude is flat and required (structured-outputs grammar stays small)", async () => {
  const { body } = await capture(ExtractionModelSchema);
  const schema = body.output_config?.format?.schema;
  assert.ok(schema, "generateObject should send output_config.format.schema");
  const c = complexity(schema);
  assert.deepEqual(c.problems, []);
  assert.equal(c.optional, 0, "no optional properties");
  assert.equal(c.defaults, 0, "no default keywords");
  assert.ok(c.unions <= 4, `at most the 4 original unions, got ${c.unions}`);
});

test("regression record: the app-level schema is NOT what we send (it has defaults and optionals)", async () => {
  const { body } = await capture(ExtractionSchema);
  const c = complexity(body.output_config.format.schema);
  assert.ok(c.optional >= 8 && c.defaults >= 8 && c.unions >= 9, JSON.stringify(c));
});

test("full round trip: model JSON → generateObject → normalizeExtraction equals the demo extraction", async () => {
  const { object, error } = await capture(ExtractionModelSchema, demoAsModelOutput());
  assert.equal(error, undefined);
  assert.deepEqual(normalizeExtraction(object as ExtractionModelOutput), demo);
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
