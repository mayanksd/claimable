"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { ArrowUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Extraction } from "@/lib/schema";
import { MAX_QUESTION_CHARS } from "@/lib/chat";
import { chatErrorMessage, createChatTransport } from "@/lib/client/chatTransport";
import { AnswerBubble, ErrorBubble, QuestionBubble, TypingBubble } from "./AnswerBubble";

export const SUGGESTED: { emoji: string; label: string; q: string }[] = [
  { emoji: "🚨", label: "Whom do I call in an emergency?", q: "Whom do I call in an emergency?" },
  { emoji: "🏥", label: "Is my hospital cashless?", q: "Is my hospital cashless?" },
  { emoji: "🦴", label: "I broke my wrist", q: "I broke my wrist. What is covered?" },
  { emoji: "🦷", label: "Tooth extraction", q: "I need a tooth extraction. Is it covered?" },
  { emoji: "🩺", label: "Book my free check-up", q: "When can I use my free health check-up?" },
];

type Props = {
  extraction: Extraction;
  redactedText: string;
  demo: boolean;
  cached: Record<string, string>;
};

export function ChatPanel({ extraction, redactedText, demo, cached }: Props) {
  const ctx = useRef({ extraction, redactedText });
  ctx.current = { extraction, redactedText };
  const transport = useMemo(() => createChatTransport({ demo, cached, context: () => ctx.current }), [demo, cached]);

  const { messages, sendMessage, status, error, clearError } = useChat({ transport });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [messages, status, error]);

  function ask(q: string) {
    const text = q.trim().slice(0, MAX_QUESTION_CHARS);
    if (!text || busy) return;
    if (error) clearError();
    setInput("");
    void sendMessage({ text });
  }

  const last = messages[messages.length - 1];

  return (
    <Card className="flex h-[600px] flex-col overflow-hidden p-0 lg:sticky lg:top-[76px] lg:h-[calc(100vh-100px)]">
      <header className="border-b px-[18px] py-4 font-bold">
        Ask your policy
        <small className="block text-xs font-medium text-muted-foreground">Answers only from your documents, with the page</small>
      </header>

      <div ref={list} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
        <div className="max-w-[92%] self-start rounded-[14px] rounded-bl-[4px] border bg-muted px-3.5 py-3 text-sm">
          👋 Hi! Ask me anything about your {extraction.policy.product} policy, or tap a question below.
        </div>
        {messages.map((m) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          if (m.role === "user") return <QuestionBubble key={m.id} text={text} />;
          if (!text) return null;
          return <AnswerBubble key={m.id} text={text} streaming={status === "streaming" && m === last} />;
        })}
        {status === "submitted" && <TypingBubble />}
        {status === "streaming" && last?.role === "user" && <TypingBubble />}
        {error && <ErrorBubble text={chatErrorMessage(error)} />}
      </div>

      <div className="flex flex-wrap gap-2 border-t px-4 py-2.5">
        {SUGGESTED.map((s) => (
          <button
            key={s.q}
            type="button"
            disabled={busy}
            onClick={() => ask(s.q)}
            className="cursor-pointer rounded-full border border-brand-line bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-brand-line/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2 border-t px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your policy…"
          maxLength={MAX_QUESTION_CHARS}
          aria-label="Your question"
        />
        <Button type="submit" disabled={busy || !input.trim()} aria-label="Ask">
          Ask <ArrowUp className="hidden sm:block" />
        </Button>
      </form>
    </Card>
  );
}
