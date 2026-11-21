import ReactMarkdown from "react-markdown";
import { parseAnswer, type Verdict } from "@/lib/answer";
import { cn } from "@/lib/utils";

const PILL: Record<Verdict, string> = {
  COVERED: "bg-good-soft text-good",
  "PARTLY COVERED": "bg-warn-soft text-warn",
  "NOT COVERED": "bg-bad-soft text-bad",
  "NOT IN YOUR DOCUMENTS": "bg-secondary text-muted-foreground",
};

export function AnswerBubble({ text }: { text: string }) {
  const { verdict, body, source } = parseAnswer(text);
  return (
    <div className="max-w-[92%] self-start rounded-[14px] rounded-bl-[4px] border bg-muted px-3.5 py-3 text-sm leading-[1.45]">
      {verdict && (
        <span className={cn("mb-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-extrabold", PILL[verdict])}>
          {verdict}
        </span>
      )}
      <div className="[&_li]:ml-4 [&_li]:list-disc [&_p]:my-1 [&_ul]:my-1 [&_strong]:font-bold">
        <ReactMarkdown>{body}</ReactMarkdown>
      </div>
      {source && <div className="mt-2 text-[11px] text-muted-foreground">{source}</div>}
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
