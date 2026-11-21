"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AnswerBubble, QuestionBubble } from "./AnswerBubble";

export const SUGGESTED: { emoji: string; label: string; q: string }[] = [
  { emoji: "🚨", label: "Whom do I call in an emergency?", q: "Whom do I call in an emergency?" },
  { emoji: "🏥", label: "Is my hospital cashless?", q: "Is my hospital cashless?" },
  { emoji: "🦴", label: "I broke my wrist", q: "I broke my wrist. What is covered?" },
  { emoji: "🦷", label: "Tooth extraction", q: "I need a tooth extraction. Is it covered?" },
  { emoji: "🩺", label: "Book my free check-up", q: "When can I use my free health check-up?" },
];

type Msg = { role: "user" | "assistant"; text: string };

/**
 * Step 1: static panel answered from demo/cached-answers.json.
 * Step 3 swaps this for useChat + /api/chat streaming.
 */
export function ChatPanel({ cached, initial = [] }: { cached: Record<string, string>; initial?: string[] }) {
  const [msgs, setMsgs] = useState<Msg[]>(() =>
    initial.flatMap((q) => (cached[q] ? [{ role: "user" as const, text: q }, { role: "assistant" as const, text: cached[q] }] : [])),
  );
  const list = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  // Scroll only the message list (never the page), and not on first render.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  const ask = (q: string) => {
    const answer = cached[q];
    if (answer) setMsgs((m) => [...m, { role: "user", text: q }, { role: "assistant", text: answer }]);
  };

  return (
    <Card className="flex h-[600px] flex-col overflow-hidden p-0 lg:sticky lg:top-[76px] lg:h-[calc(100vh-100px)]">
      <header className="border-b px-[18px] py-4 font-bold">
        Ask your policy
        <small className="block text-xs font-medium text-muted-foreground">Answers only from your documents, with the page</small>
      </header>
      <div ref={list} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {msgs.map((m, i) =>
          m.role === "user" ? <QuestionBubble key={i} text={m.text} /> : <AnswerBubble key={i} text={m.text} />,
        )}
      </div>
      <div className="flex flex-wrap gap-2 border-t px-4 py-2.5">
        {SUGGESTED.map((s) => (
          <button
            key={s.q}
            type="button"
            onClick={() => ask(s.q)}
            className="cursor-pointer rounded-full border border-brand-line bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-brand-line/50"
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>
      <form className="flex gap-2 border-t px-4 py-3" onSubmit={(e) => e.preventDefault()}>
        <Input placeholder="Ask anything about your policy…" disabled title="Free-text questions arrive with live chat" />
        <Button type="submit" disabled>
          Ask
        </Button>
      </form>
    </Card>
  );
}
