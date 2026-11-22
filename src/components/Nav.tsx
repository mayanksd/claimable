import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  sample?: boolean;
  /** Which nav action matches the current screen (shown as pressed). */
  active?: "home" | "upload" | null;
  onHome: () => void;
  onUpload: () => void;
};

/** On every screen: 🏠 Home (the check-up agent + persona picker) and ⬆️ Use my own policy. */
export function Nav({ sample = false, active = null, onHome, onUpload }: Props) {
  const pill = (on: boolean) =>
    cn(
      "inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-bold whitespace-nowrap transition-colors max-sm:min-h-11 max-sm:px-3",
      on ? "border-brand bg-brand-soft text-brand" : "bg-white hover:border-brand-line hover:bg-brand-soft",
    );
  return (
    <nav className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border/70 bg-white/75 px-3 py-3 backdrop-blur-md sm:px-6 sm:py-3.5">
      <button type="button" onClick={onHome} aria-label="Claimable home" className="flex shrink-0 cursor-pointer items-center gap-2.5 text-left">
        <Logo className="size-8 shrink-0" />
        <div className="leading-tight max-sm:hidden">
          <div className="font-display text-xl font-extrabold">Claimable</div>
          <div className="hidden text-xs text-muted-foreground md:block">See what your health policy owes you</div>
        </div>
      </button>
      <div className="flex min-w-0 items-center gap-2">
        {sample && (
          <Badge variant="secondary" className="hidden lg:inline-flex">
            Sample policy · fictional
          </Badge>
        )}
        <button type="button" onClick={onHome} aria-current={active === "home" ? "page" : undefined} className={pill(active === "home")}>
          <span aria-hidden>🏠</span> Home
        </button>
        <button type="button" onClick={onUpload} aria-current={active === "upload" ? "page" : undefined} className={pill(active === "upload")}>
          <span aria-hidden>⬆️</span> Use my own policy
        </button>
      </div>
    </nav>
  );
}
