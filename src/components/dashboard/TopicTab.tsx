import { Badge } from "@/components/ui/badge";
import type { Extraction } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { splitTopicItems } from "@/lib/topicOrder";
import { ChevronDown } from "lucide-react";

type Section = Extraction["family"];
type Status = Section["items"][number]["status"];

const STATUS: Record<Status, { label: string; className: string }> = {
  covered: { label: "Covered", className: "bg-good-soft text-good" },
  partly: { label: "Partly covered", className: "bg-warn-soft text-warn" },
  waiting: { label: "Waiting period", className: "bg-brand-soft text-brand" },
  not_covered: { label: "Not covered", className: "bg-bad-soft text-bad" },
};

type Props = {
  section: Section;
  /** Lead line shown above the list (e.g. the maternity exclusion + tip). */
  intro?: React.ReactNode;
  /** Shown when the policy says nothing about this topic. */
  emptyText: string;
};

/** A list of plain-words cover items for one life topic, with "Covered from <date>" for waits. */
export function TopicTab({ section, intro, emptyText }: Props) {
  const { items, notMentioned } = section;
  const { shown, notCovered } = splitTopicItems(items);
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed bg-white px-5 py-8 text-center text-sm text-muted-foreground">
        {emptyText}
        {notMentioned.length > 0 && <div className="mt-1 text-xs">({notMentioned.join(", ")})</div>}
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      {intro}
      {shown.length > 0 && (
        <ul className="grid gap-2.5">
          {shown.map((i) => (
            <TopicRow key={i.id} item={i} />
          ))}
        </ul>
      )}
      {notCovered.length > 0 && (
        // Not-covered items last, collapsed, so the tab leads with what you can use.
        <details className="group rounded-xl border bg-white">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
            Not covered ({notCovered.length})
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <ul className="grid gap-2.5 border-t p-2.5">
            {notCovered.map((i) => (
              <TopicRow key={i.id} item={i} />
            ))}
          </ul>
        </details>
      )}
      {notMentioned.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Your policy doesn&apos;t mention: {notMentioned.join(", ")} — ask your insurer.
        </p>
      )}
    </div>
  );
}

function TopicRow({ item: i }: { item: Section["items"][number] }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border bg-white px-4 py-3">
      <span className="text-2xl leading-none" aria-hidden>
        {i.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <b>{i.title}</b>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", STATUS[i.status].className)}>
            {i.status === "waiting" && i.coveredFrom ? `Covered from ${i.coveredFrom}` : STATUS[i.status].label}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">{i.detail}</div>
      </div>
      <Badge variant="outline">p.{i.sourcePage}</Badge>
    </li>
  );
}
