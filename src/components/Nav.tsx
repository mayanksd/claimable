import { RotateCcw } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Nav({ sample = false, onStartOver, onHome }: { sample?: boolean; onStartOver?: () => void; onHome?: () => void }) {
  return (
    <nav className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/70 bg-white/75 px-6 py-3.5 backdrop-blur-md">
      <button
        type="button"
        onClick={onHome}
        disabled={!onHome}
        aria-label={onHome ? "Claimable home" : undefined}
        className="flex items-center gap-2.5 text-left enabled:cursor-pointer"
      >
        <Logo className="size-8 shrink-0" />
        <div className="leading-tight">
          <div className="font-display text-xl font-extrabold">Claimable</div>
          <div className="hidden text-xs text-muted-foreground sm:block">See what your health policy owes you</div>
        </div>
      </button>
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
