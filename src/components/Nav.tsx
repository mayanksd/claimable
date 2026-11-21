import { RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Nav({ sample = false, onStartOver }: { sample?: boolean; onStartOver?: () => void }) {
  return (
    <nav className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/70 bg-white/75 px-4 py-3.5 backdrop-blur-md sm:px-7">
      <div className="flex items-center gap-2.5">
        <span className="inline-block size-7 rounded-lg bg-gradient-to-br from-brand to-brand-2" aria-hidden />
        <div className="leading-tight">
          <div className="font-display text-xl font-extrabold">Claimable</div>
          <div className="hidden text-xs text-muted-foreground sm:block">See what your health policy owes you</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {sample && (
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Sample policy · fictional
          </Badge>
        )}
        {onStartOver && (
          <Button variant="outline" size="sm" className="rounded-full" onClick={onStartOver}>
            <RotateCcw /> Start over
          </Button>
        )}
      </div>
    </nav>
  );
}
