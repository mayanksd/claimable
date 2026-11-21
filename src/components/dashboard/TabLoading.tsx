import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder rows while part B of the extraction is still on its way. */
export function TabLoading({ label }: { label: string }) {
  return (
    <div className="grid gap-2.5" aria-busy="true" aria-live="polite">
      <p className="text-sm text-muted-foreground">{label}</p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl border bg-white px-4 py-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Part B failed: the rest of the dashboard still works. */
export function TabUnavailable() {
  return (
    <div className="rounded-2xl border border-dashed bg-white px-5 py-8 text-center text-sm text-muted-foreground">
      We couldn&apos;t finish reading this part of your policy. Tap <b className="text-foreground">Start over</b> to try again.
    </div>
  );
}
