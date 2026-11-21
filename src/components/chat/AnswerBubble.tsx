import ReactMarkdown from "react-markdown";
import { parseAnswer, VERDICTS, type Verdict } from "@/lib/answer";
import { cn } from "@/lib/utils";

const PILL: Record<Verdict, string> = {
  COVERED: "bg-good-soft text-good",
  "PARTLY COVERED": "bg-warn-soft text-warn",
  "NOT COVERED": "bg-bad-soft text-bad",
  "NOT IN YOUR DOCUMENTS": "bg-secondary text-muted-foreground",
};

const bubble = "max-w-[92%] self-start rounded-[14px] rounded-bl-[4px] border bg-muted px-3.5 py-3 text-sm leading-[1.45]";

export function TypingBubble() {
  return (
    <div className={cn(bubble, "flex gap-1 py-4")} aria-label="Answering">
      {[0, 150, 300].map((d) => (
        <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${d}ms` }} />
      ))}
    </div>
  );
}

/** While the first line is still arriving it may be half a verdict ("PARTLY COV"): don't flash it as text. */
function verdictPending(text: string) {
  if (text.includes("\n")) return false;
  const t = text.replace(/[*_`#]/g, "").trim();
  return VERDICTS.some((v) => v.startsWith(t));
}

export function AnswerBubble({ text, streaming = false }: { text: string; streaming?: boolean }) {
  if (streaming && verdictPending(text)) return <TypingBubble />;
  const { verdict, body, source } = parseAnswer(text, { partial: streaming });
  return (
    <div className={bubble}>
      {verdict && (
        <span className={cn("mb-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-extrabold", PILL[verdict])}>
          {verdict}
        </span>
      )}
      <div className="[&_li]:ml-4 [&_li]:list-disc [&_p]:my-0.5 [&_strong]:font-bold [&_ul]:my-1">
        <ReactMarkdown>{body}</ReactMarkdown>
      </div>
      {source && <div className="mt-1.5 text-[11px] text-muted-foreground">{source}</div>}
    </div>
  );
}

export function QuestionBubble({ text }: { text: string }) {
  return (
    <div className="max-w-[80%] self-end rounded-[14px] rounded-br-[4px] bg-foreground px-3.5 py-2.5 text-sm text-white">
      {text}
    </div>
  );
}

export function ErrorBubble({ text }: { text: string }) {
  return (
    <div role="alert" className={cn(bubble, "border-bad/30 bg-bad-soft text-bad")}>
      {text}
    </div>
  );
}
