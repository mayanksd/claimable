"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Extraction } from "@/lib/schema";
import { MAX_QUESTION_CHARS, STARTERS, chipPrefill, withCheckupChip } from "@/lib/chat";
import { cn } from "@/lib/utils";

const STARTER_EMOJI = ["🚨", "🦷", "🩺"];
import { parseAnswer } from "@/lib/answer";
import { chatErrorMessage, createChatTransport } from "@/lib/client/chatTransport";
import { ASK_EVENT } from "@/lib/client/askChat";
import { AnswerBubble, ErrorBubble, QuestionBubble, TypingBubble } from "./AnswerBubble";

type Props = {
  extraction: Extraction;
  redactedText: string;
  demo: boolean;
  cached: Record<string, string>;
  /** Opened via "Talk to my policy": bring the chat into view and put the cursor in the box. */
  focusOnMount?: boolean;
  /** The dedicated chat screen: fills the viewport instead of sitting in the dashboard's right column. */
  fullScreen?: boolean;
};

export function ChatPanel({ extraction, redactedText, demo, cached, focusOnMount, fullScreen }: Props) {
  const ctx = useRef({ extraction, redactedText });
  ctx.current = { extraction, redactedText };
  const transport = useMemo(() => createChatTransport({ demo, cached, context: () => ctx.current }), [demo, cached]);

  const { messages, sendMessage, status, error, clearError } = useChat({ transport });
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!focusOnMount) return;
    const t = setTimeout(() => {
      if (!fullScreen) document.getElementById("chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
      inputRef.current?.focus({ preventScroll: true });
    }, 450);
    return () => clearTimeout(t);
  }, [focusOnMount, fullScreen]);

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

  // "How do I claim this?" on a perk card: ask it here (or queue it in the box if an answer is streaming).
  const askRef = useRef(ask);
  askRef.current = ask;
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => {
    const onAsk = (ev: Event) => {
      const q = (ev as CustomEvent<string>).detail;
      if (!q) return;
      if (busyRef.current) {
        setInput(q);
        inputRef.current?.focus();
      } else askRef.current(q);
      if (window.matchMedia("(max-width: 1023px)").matches) {
        document.getElementById("chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, []);

  const last = messages[messages.length - 1];
  const textOf = (m: (typeof messages)[number]) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

  // Before the first answer: starter chips. After it: the latest answer's follow-ups + "Ask something else".
  const lastAnswer = messages.findLast((m) => m.role === "assistant");
  const started = !!lastAnswer;
  const lastQuestion = messages.findLast((m) => m.role === "user");
  // Starters live in the welcome card; the chip bar is for follow-ups once a conversation exists.
  const chips = !started
    ? []
    : busy && last === lastAnswer
      ? []
      : (() => {
          const a = parseAnswer(textOf(lastAnswer));
          return withCheckupChip(lastQuestion ? textOf(lastQuestion) : "", a.body, a.followups);
        })();

  return (
    <Card
      id="chat"
      className={cn(
        "flex scroll-mt-20 flex-col overflow-hidden p-0",
        fullScreen ? "h-[calc(100dvh-196px)] min-h-[460px]" : "h-[600px] lg:sticky lg:top-[96px] lg:h-[min(680px,calc(100vh-120px))]",
      )}
    >
      <header className="border-b px-[18px] py-4 font-bold">
        Talk to your policy
        <small className="block text-xs font-medium text-muted-foreground">Answers only from your documents, with the page</small>
      </header>

      <div ref={list} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
        {!started && !busy && (
          <div className="m-auto flex w-full max-w-[320px] flex-col items-center py-4 text-center">
            <span aria-hidden className="grid size-14 place-items-center rounded-full bg-warm-soft text-[28px] leading-none">
              💬
            </span>
            <h3 className="mt-3 text-xl font-bold">Ask your policy anything</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Short answers from your {extraction.policy.product} documents, with the page. Try one:
            </p>
            <div className="mt-5 grid w-full gap-2">
              {STARTERS.map((q, i) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-brand-line bg-brand-soft px-3.5 text-left text-sm font-semibold text-brand transition-all hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
                >
                  <span aria-hidden>{STARTER_EMOJI[i] ?? "💡"}</span>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => {
          const text = textOf(m);
          if (m.role === "user") return <QuestionBubble key={m.id} text={text} />;
          if (!text) return null;
          return <AnswerBubble key={m.id} text={text} streaming={status === "streaming" && m === last} />;
        })}
        {status === "submitted" && <TypingBubble />}
        {status === "streaming" && last?.role === "user" && <TypingBubble />}
        {error && <ErrorBubble text={chatErrorMessage(error)} />}
      </div>

      <div className={cn("flex flex-wrap gap-2 border-t px-4 py-2.5", !started && "hidden")}>
        {chips.map((q) => (
          <button
            key={q}
            type="button"
            disabled={busy}
            onClick={() => {
              const prefill = chipPrefill(q);
              if (prefill === null) return ask(q);
              setInput(prefill);
              inputRef.current?.focus();
            }}
            className="min-h-9 cursor-pointer rounded-full border border-brand-line bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand-line/50 disabled:cursor-not-allowed disabled:opacity-50 max-sm:min-h-11"
          >
            {q}
          </button>
        ))}
        {started && (
          <button
            type="button"
            onClick={() => inputRef.current?.focus()}
            className="flex min-h-9 cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary max-sm:min-h-11"
          >
            <MessageCircle className="size-3.5" /> Ask something else
          </button>
        )}
      </div>

      <form
        className="flex gap-2 border-t px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <Input
          ref={inputRef}
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
