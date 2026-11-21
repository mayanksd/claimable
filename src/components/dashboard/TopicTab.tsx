import { Badge } from "@/components/ui/badge";
import type { Extraction } from "@/lib/schema";
import { cn } from "@/lib/utils";

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
      <ul className="grid gap-2.5">
        {items.map((i) => (
          <li key={i.id} className="flex items-start gap-3 rounded-xl border bg-white px-4 py-3">
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
        ))}
      </ul>
      {notMentioned.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Your policy doesn&apos;t mention: {notMentioned.join(", ")} — ask your insurer.
        </p>
      )}
    </div>
  );
}
