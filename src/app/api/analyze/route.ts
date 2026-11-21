import { generateText, type ModelMessage } from "ai";
import { model } from "@/lib/ai";
import { redact } from "@/lib/redact";
import { normalizeExtraction } from "@/lib/modelSchema";
import { parseExtraction } from "@/lib/parseExtraction";
import { buildExtractionSystem } from "@/lib/extractionPrompt";
import { withSourcesOnly } from "@/lib/extraction";
import { demoEvents } from "@/lib/demoEvents";
import { MAX_PDF_BYTES, MAX_SCREENS, MAX_UPLOAD_BYTES, SCANNED_PDF_MESSAGE, mb, pdfTooBigMessage } from "@/lib/limits";
import { notHealthMessage, type AnalyzeEvent } from "@/lib/analysis";
import { pdfToMarkedText } from "@/lib/server/pdf";
import { loadPrompt } from "@/lib/server/prompts";
import { describeError, showErrorDetail, statusOf } from "@/lib/server/errors";

export const runtime = "nodejs";
// Vercel Hobby with fluid compute allows up to 300 s; long policies can need two model calls.
export const maxDuration = 120;

/** Room for the full JSON (≈3–5k tokens) plus any thinking the model does first. */
const MAX_OUTPUT_TOKENS = 16000;
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
    // 1. PDF → text per page with [[PAGE n]] markers
    let pdf: { text: string; pages: number };
    try {
      pdf = await pdfToMarkedText(new Uint8Array(await policy.arrayBuffer()));
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
    const redacted = redact(pdf.text);
    yield { type: "masked", count: redacted.count, kinds: redacted.kinds };

    // 3. Structured extraction
    const images = await Promise.all(
      screens.map(async (f) => ({
        type: "image" as const,
        image: Buffer.from(await f.arrayBuffer()).toString("base64"),
        mediaType: f.type,
      })),
    );
    try {
      // Plain-text JSON, parsed and validated here. Structured outputs can't compile a grammar this size.
      const system = buildExtractionSystem(loadPrompt("extract"));
      const messages: ModelMessage[] = [{ role: "user", content: [{ type: "text", text: redacted.text }, ...images] }];
      const ask = async () =>
        (await generateText({ model, system, messages, maxOutputTokens: MAX_OUTPUT_TOKENS, maxRetries: 1 })).text;

      let answer = await ask();
      let parsed = parseExtraction(answer);
      // One retry with the problems spelled out, only if at least 45 s of maxDuration remain.
      if (!parsed.ok && deadline - Date.now() >= MIN_REMAINING_FOR_RETRY_MS) {
        console.warn(`[analyze] answer unusable, retrying once: ${parsed.issues.join("; ")}`);
        messages.push(
          { role: "assistant", content: answer },
          {
            role: "user",
            content: `Fix these issues and return only JSON (a single object, no markdown):\n- ${parsed.issues.join("\n- ")}`,
          },
        );
        answer = await ask();
        parsed = parseExtraction(answer);
      }
      if (!parsed.ok) {
        const detail = `Unusable AI answer: ${parsed.issues.join("; ")}`;
        console.error(`[analyze] ${detail}\n--- answer start ---\n${answer.slice(0, 1500)}`);
        yield {
          type: "error",
          message: "We couldn't make sense of the AI's answer for this policy. Please try again in a moment.",
          ...(showErrorDetail() ? { detail } : {}),
        };
        return;
      }
      if (parsed.dropped.length || parsed.repaired) {
        console.warn(`[analyze] parsed with fixes: repaired=${parsed.repaired} dropped=${parsed.dropped.join(", ")}`);
      }
      const object = parsed.data;
      const notHealth = notHealthMessage(object.documentType);
      if (notHealth) {
        yield { type: "error", message: notHealth };
        return;
      }
      const extraction = withSourcesOnly(normalizeExtraction(object));
      if (!screens.length) extraction.rewards = null;
      yield {
        type: "done",
        result: {
          extraction,
          redactedText: redacted.text,
          redactions: { count: redacted.count, kinds: redacted.kinds },
          firstName: redacted.firstName,
        },
      };
    } catch (err) {
      const detail = describeError(err);
      console.error(`[analyze] extraction failed: ${detail}`, err);
      const status = statusOf(err);
      yield {
        type: "error",
        message:
          status === 401 || status === 403
            ? "The AI key on this server was rejected (ANTHROPIC_API_KEY is invalid). Check it in your Vercel project settings, or try the sample with ?demo=1."
            : "The AI couldn't read this policy just now. Please try again in a moment.",
        ...(showErrorDetail() ? { detail } : {}),
      };
    }
  });
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
