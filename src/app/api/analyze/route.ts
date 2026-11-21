import { generateText, type ModelMessage } from "ai";
import type { z } from "zod";
import { model } from "@/lib/ai";
import { redact } from "@/lib/redact";
import { PartASchema, PartBSchema, mergeParts, type PartA, type PartB } from "@/lib/modelSchema";
import { fixPreExisting } from "@/lib/preExisting";
import { parseWith } from "@/lib/parseExtraction";
import { buildPartSystem } from "@/lib/extractionPrompt";
import type { Extraction } from "@/lib/schema";
import { withSourcesOnly } from "@/lib/extraction";
import { demoEvents } from "@/lib/demoEvents";
import { MAX_PDF_BYTES, MAX_SCREENS, MAX_UPLOAD_BYTES, SCANNED_PDF_MESSAGE, mb, pdfTooBigMessage } from "@/lib/limits";
import { notHealthMessage, type AnalysisResult, type AnalyzeEvent } from "@/lib/analysis";
import { pdfToMarkedText } from "@/lib/server/pdf";
import { loadPrompt } from "@/lib/server/prompts";
import { describeError, showErrorDetail, statusOf } from "@/lib/server/errors";

export const runtime = "nodejs";
// Vercel Hobby with fluid compute allows up to 300 s; long policies can need two model calls.
export const maxDuration = 120;

/** Each part's JSON is ≈1.5–3k tokens; with thinking off this leaves plenty of room. */
const MAX_OUTPUT_TOKENS = 8000;

/**
 * Extraction is reading + copying, not reasoning: no upfront thinking, low effort.
 * Sonnet 5.5 rejects `thinking: disabled`; `between_tools` is its lowest setting (valid at low effort).
 */
const EXTRACTION_PROVIDER_OPTIONS = { anthropic: { thinking: { type: "between_tools" }, effort: "low" } } as const;
/** Only retry if at least this much of the maxDuration budget is left for a second call. */
const MIN_REMAINING_FOR_RETRY_MS = 45_000;

const fail = (message: string, status: number) => Response.json({ error: message }, { status });

export async function POST(req: Request) {
  const deadline = Date.now() + maxDuration * 1000;
  const demo = process.env.DEMO_MODE === "1" || new URL(req.url).searchParams.get("demo") === "1";
  if (demo) return streamEvents(demoEvents);

  if (!process.env.ANTHROPIC_API_KEY) {
    return fail(
      "The AI key isn't set up on this server (ANTHROPIC_API_KEY is missing). Add it in your Vercel project settings, or try the sample with ?demo=1.",
      500,
    );
  }

  const size = Number(req.headers.get("content-length") ?? 0);
  if (size > MAX_UPLOAD_BYTES) return fail(`That upload is ${mb(size)}. Please keep it under ${mb(MAX_UPLOAD_BYTES)}.`, 413);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Couldn't read the upload. Please try again.", 400);
  }

  const policy = form.get("policy");
  if (!(policy instanceof File) || policy.size === 0) return fail("Please add your policy PDF.", 400);
  if (policy.type !== "application/pdf" && !policy.name.toLowerCase().endsWith(".pdf")) {
    return fail("The policy must be a PDF file.", 400);
  }
  if (policy.size > MAX_PDF_BYTES) {
    return fail(pdfTooBigMessage(policy.size), 413);
  }
  const screens = form
    .getAll("screens[]")
    .filter((f): f is File => f instanceof File && f.size > 0 && f.type.startsWith("image/"))
    .slice(0, MAX_SCREENS);

  return streamEvents(async function* () {
    const timing = new StageTimer();

    // 1. PDF → text per page with [[PAGE n]] markers
    let pdf: { text: string; pages: number };
    try {
      pdf = await timing.time("pdf", () => policy.arrayBuffer().then((b) => pdfToMarkedText(new Uint8Array(b))));
    } catch {
      yield { type: "error", message: "We couldn't read that PDF. Is it password-protected or damaged?" };
      return;
    }
    if (pdf.text.replace(/\[\[PAGE \d+\]\]/g, "").trim().length < 200) {
      yield { type: "error", message: SCANNED_PDF_MESSAGE };
      return;
    }
    yield { type: "read", pages: pdf.pages, screens: screens.length };

    // 2. Mask personal data. Only the redacted text ever reaches the model.
    const redacted = await timing.time("redact", async () => redact(pdf.text));
    yield { type: "masked", count: redacted.count, kinds: redacted.kinds };

    // 3. Extraction: two parallel calls. A = Perks tab, B = the other tabs + document checks.
    const images = await Promise.all(
      screens.map(async (f) => ({
        type: "image" as const,
        image: Buffer.from(await f.arrayBuffer()).toString("base64"),
        mediaType: f.type,
      })),
    );
    const base = loadPrompt("extract");
    const run = <T,>(part: "A" | "B", schema: z.ZodType<T>) =>
      extractPart({ part, schema, base, policyText: redacted.text, images: part === "A" ? images : [], deadline, timing });
    const partA = run("A", PartASchema);
    const partB = settle(run("B", PartBSchema));

    const resultFor = (extraction: Extraction, extra: Partial<AnalysisResult> = {}): AnalysisResult => {
      const e = withSourcesOnly(extraction);
      if (!screens.length) e.rewards = null;
      return {
        extraction: e,
        redactedText: redacted.text,
        redactions: { count: redacted.count, kinds: redacted.kinds },
        firstName: redacted.firstName,
        ...extra,
      };
    };

    let a: PartA;
    try {
      a = await partA;
    } catch (err) {
      timing.log({ outcome: "error-A" });
      yield extractionError(err);
      return;
    }

    // Part B already finished? Send everything at once; otherwise open the dashboard now.
    const early = await Promise.race([partB, Promise.resolve(null)]);
    if (early?.ok) {
      const notHealth = notHealthMessage(early.value.documentType);
      timing.log({ outcome: notHealth ? "not-health" : "done", order: "B-first" });
      if (notHealth) {
        yield { type: "error", message: notHealth };
        return;
      }
      yield { type: "done", result: resultFor(mergeParts(a, withPedRule(early.value, redacted.text))) };
      return;
    }
    if (early && !early.ok) {
      timing.log({ outcome: "done-without-B" });
      yield { type: "done", result: resultFor(mergeParts(a, null), { partBFailed: true }) };
      return;
    }
    yield { type: "done", result: resultFor(mergeParts(a, null), { pending: true }) };

    const b = await partB;
    if (!b.ok) {
      timing.log({ outcome: "done-without-B" });
      yield { type: "update", partBFailed: true, ...(showErrorDetail() ? { detail: describeError(b.error) } : {}) };
      return;
    }
    const notHealth = notHealthMessage(b.value.documentType);
    timing.log({ outcome: notHealth ? "not-health" : "done", order: "A-first" });
    if (notHealth) {
      yield { type: "update", notHealth };
      return;
    }
    yield { type: "update", extraction: resultFor(mergeParts(a, withPedRule(b.value, redacted.text))).extraction };
  });
}

/**
 * Accuracy rule on part B: a pre-existing condition is a waiting period (never "not covered"),
 * and nothing is "permanently excluded" unless the policy text says so for that item.
 */
function withPedRule(b: PartB, policyText: string): PartB {
  return {
    ...b,
    family: { ...b.family, items: fixPreExisting(b.family.items, policyText) },
    lifestyle: { ...b.lifestyle, items: fixPreExisting(b.lifestyle.items, policyText) },
  };
}

/** Wall-clock per stage, logged as one JSON line so Vercel logs are easy to read. */
class StageTimer {
  private start = Date.now();
  private stages: Record<string, number | string> = {};
  async time<T>(stage: string, fn: () => Promise<T>): Promise<T> {
    const t0 = Date.now();
    try {
      return await fn();
    } finally {
      this.stages[stage] = Date.now() - t0;
    }
  }
  note(key: string, value: number | string) {
    this.stages[key] = value;
  }
  log(extra: Record<string, string>) {
    console.info(`[analyze:timing] ${JSON.stringify({ totalMs: Date.now() - this.start, ...this.stages, ...extra })}`);
  }
}

const settle = <T,>(p: Promise<T>) =>
  p.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );

class UnusableAnswer extends Error {
  constructor(part: string, issues: string[]) {
    super(`Unusable AI answer (part ${part}): ${issues.join("; ")}`);
  }
}

/** One part of the extraction: call, parse, one retry if time allows. Throws on failure. */
async function extractPart<T>(o: {
  part: "A" | "B";
  schema: z.ZodType<T>;
  base: string;
  policyText: string;
  images: { type: "image"; image: string; mediaType: string }[];
  deadline: number;
  timing: StageTimer;
}): Promise<T> {
  const system = buildPartSystem(o.base, o.part);
  const messages: ModelMessage[] = [{ role: "user", content: [{ type: "text", text: o.policyText }, ...o.images] }];

  const ask = async (label: string) => {
    const t0 = Date.now();
    const r = await generateText({
      model,
      system,
      messages,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      maxRetries: 1,
      providerOptions: EXTRACTION_PROVIDER_OPTIONS,
    });
    o.timing.note(`model${o.part}${label}Ms`, Date.now() - t0);
    o.timing.note(`tokens${o.part}${label}`, `${r.usage.inputTokens ?? "?"} in / ${r.usage.outputTokens ?? "?"} out / ${r.finishReason}`);
    return r.text;
  };

  let answer = await ask("");
  let parsed = await o.timing.time(`parse${o.part}Ms`, async () => parseWith(answer, o.schema));
  // One retry with the problems spelled out, only if at least 45 s of maxDuration remain.
  if (!parsed.ok && o.deadline - Date.now() >= MIN_REMAINING_FOR_RETRY_MS) {
    console.warn(`[analyze] part ${o.part} unusable, retrying once: ${parsed.issues.join("; ")}`);
    messages.push(
      { role: "assistant", content: answer },
      { role: "user", content: `Fix these issues and return only JSON (a single object, no markdown):\n- ${parsed.issues.join("\n- ")}` },
    );
    answer = await ask("Retry");
    parsed = parseWith(answer, o.schema);
  }
  if (!parsed.ok) {
    console.error(`[analyze] part ${o.part}: ${parsed.issues.join("; ")}\n--- answer start ---\n${answer.slice(0, 1500)}`);
    throw new UnusableAnswer(o.part, parsed.issues);
  }
  if (parsed.dropped.length || parsed.repaired) {
    console.warn(`[analyze] part ${o.part} parsed with fixes: repaired=${parsed.repaired} dropped=${parsed.dropped.join(", ")}`);
  }
  return parsed.data;
}

function extractionError(err: unknown): AnalyzeEvent {
  const detail = describeError(err);
  console.error(`[analyze] extraction failed: ${detail}`, err);
  const status = statusOf(err);
  return {
    type: "error",
    message:
      err instanceof UnusableAnswer
        ? "We couldn't make sense of the AI's answer for this policy. Please try again in a moment."
        : status === 401 || status === 403
          ? "The AI key on this server was rejected (ANTHROPIC_API_KEY is invalid). Check it in your Vercel project settings, or try the sample with ?demo=1."
          : "The AI couldn't read this policy just now. Please try again in a moment.",
    ...(showErrorDetail() ? { detail } : {}),
  };
}

function streamEvents(gen: () => AsyncGenerator<AnalyzeEvent>): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of gen()) controller.enqueue(enc.encode(JSON.stringify(ev) + "\n"));
      } catch (err) {
        const detail = describeError(err);
        console.error(`[analyze] ${detail}`, err);
        const ev: AnalyzeEvent = { type: "error", message: "Something went wrong. Please try again.", ...(showErrorDetail() ? { detail } : {}) };
        controller.enqueue(enc.encode(JSON.stringify(ev) + "\n"));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
