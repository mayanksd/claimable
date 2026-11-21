import { Badge } from "@/components/ui/badge";

export function Nav({ sample = false }: { sample?: boolean }) {
  return (
    <nav className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3.5 sm:px-7">
      <div className="flex items-center gap-2.5">
        <span className="inline-block size-7 rounded-lg bg-gradient-to-br from-brand to-brand-2" aria-hidden />
        <div className="leading-tight">
          <div className="text-lg font-extrabold">Claimable</div>
          <div className="hidden text-xs text-muted-foreground sm:block">See what your health policy owes you</div>
        </div>
      </div>
      {sample && <Badge variant="secondary">Sample policy · fictional</Badge>}
    </nav>
  );
}
