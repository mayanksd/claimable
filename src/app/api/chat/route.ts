import { APICallError, convertToModelMessages, streamText, type UIMessage } from "ai";
import { model } from "@/lib/ai";
import { redact } from "@/lib/redact";
import { ExtractionSchema } from "@/lib/schema";
import { MAX_CHAT_MESSAGES, MAX_QUESTION_CHARS, NO_KEY_MESSAGE, type ChatErrorCode } from "@/lib/chat";
import { loadPrompt } from "@/lib/server/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const fail = (error: string, code: ChatErrorCode, status: number) => Response.json({ error, code }, { status });

type Body = { messages?: UIMessage[]; extraction?: unknown; redactedText?: unknown };

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return fail(NO_KEY_MESSAGE, "NO_KEY", 500);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return fail("Couldn't read the question. Please try again.", "BAD_REQUEST", 400);
  }

  const parsed = ExtractionSchema.safeParse(body.extraction);
  if (!parsed.success || typeof body.redactedText !== "string" || !Array.isArray(body.messages) || !body.messages.length) {
    return fail("Your policy isn't loaded any more. Please start over and upload it again.", "BAD_REQUEST", 400);
  }

  // The client already holds redacted text; mask again so nothing personal can reach the model
  // even if the stored text was tampered with or came from an older build.
  const policyText = redact(body.redactedText).text;

  const messages = body.messages.slice(-MAX_CHAT_MESSAGES).map((m) =>
    m.role === "user"
      ? { ...m, parts: m.parts.map((p) => (p.type === "text" ? { ...p, text: redact(p.text.slice(0, MAX_QUESTION_CHARS)).text } : p)) }
      : m,
  );

  const system = `${loadPrompt("chat")}\n\nEXTRACTION JSON:\n${JSON.stringify(parsed.data)}\n\nPOLICY TEXT:\n${policyText}`;

  const result = streamText({ model, system, messages: convertToModelMessages(messages) });

  return result.toUIMessageStreamResponse({
    onError: (err) => {
      console.error("[chat]", err);
      const status = APICallError.isInstance(err) ? err.statusCode : undefined;
      return status === 401 || status === 403
        ? "The AI key on this server was rejected (ANTHROPIC_API_KEY is invalid). Check it in your Vercel project settings."
        : "Sorry, I couldn't answer that just now. Please try again.";
    },
  });
}
