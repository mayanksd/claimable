import { DefaultChatTransport, type ChatTransport, type UIMessage, type UIMessageChunk } from "ai";
import type { Extraction } from "@/lib/schema";
import { MAX_CHAT_MESSAGES, STARTERS } from "@/lib/chat";

/** Shown in demo mode without a key; its FOLLOWUPS line brings the starter chips back. */
export const DEMO_FREE_TEXT_MESSAGE = `In demo mode I can only answer the suggested questions. Tap one below.\nFOLLOWUPS: ${STARTERS.join(" | ")}`;

const textOf = (m: UIMessage | undefined) =>
  m?.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim() ?? "";

/** Streams a canned answer word by word so it renders exactly like a live one. */
function fakeStream(text: string): ReadableStream<UIMessageChunk> {
  const words = text.split(/(?<=\s)/);
  const id = "t" + Math.random().toString(36).slice(2);
  let i = 0;
  return new ReadableStream<UIMessageChunk>({
    start(c) {
      c.enqueue({ type: "start" });
      c.enqueue({ type: "text-start", id });
    },
    async pull(c) {
      if (i < words.length) {
        await new Promise((r) => setTimeout(r, 18));
        c.enqueue({ type: "text-delta", id, delta: words.slice(i, i + 2).join("") });
        i += 2;
        return;
      }
      c.enqueue({ type: "text-end", id });
      c.enqueue({ type: "finish" });
      c.close();
    },
  });
}

/** Turns the transport's thrown error (the response body) into a readable message. */
export function chatErrorMessage(err: Error | undefined): string {
  if (!err) return "";
  try {
    const j = JSON.parse(err.message) as { error?: string };
    if (j.error) return j.error;
  } catch {}
  return /fetch|network/i.test(err.message)
    ? "Couldn't reach the server. Check your connection and try again."
    : "Sorry, something went wrong. Please try again.";
}

export function createChatTransport(opts: {
  demo: boolean;
  cached: Record<string, string>;
  context: () => { extraction: Extraction; redactedText: string };
}): ChatTransport<UIMessage> {
  const http = new DefaultChatTransport<UIMessage>({
    api: "/api/chat",
    prepareSendMessagesRequest: ({ messages }) => ({
      body: { messages: messages.slice(-MAX_CHAT_MESSAGES), ...opts.context() },
    }),
  });

  return {
    async sendMessages(o) {
      const question = textOf(o.messages.findLast((m) => m.role === "user"));
      if (opts.demo && opts.cached[question]) return fakeStream(opts.cached[question]);
      try {
        return await http.sendMessages(o);
      } catch (err) {
        // Demo without a key: a friendly nudge instead of a setup error.
        if (opts.demo && err instanceof Error && /"NO_KEY"/.test(err.message)) return fakeStream(DEMO_FREE_TEXT_MESSAGE);
        throw err;
      }
    },
    reconnectToStream: () => Promise.resolve(null),
  };
}
