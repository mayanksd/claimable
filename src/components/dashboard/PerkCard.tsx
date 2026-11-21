import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Extraction } from "@/lib/schema";
import { effortTag } from "@/lib/perks";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BASE_PACKAGE } from "@/data/test-prices";

type Perk = Extraction["perks"][number];

const FREQ: Record<Perk["frequency"], string> = {
  per_year: "/ year",
  per_policy_term: "/ policy term",
  per_event: "/ event",
  one_time: "once",
  unlimited: "",
};

type Props = {
  perk: Perk;
  /** Optional cover: only applies if bought, so label it and skip the effort tag. */
  optional?: boolean;
  claimed?: boolean;
  onToggleClaimed?: () => void;
  /** Health check-up only. */
  onMaxCheckup?: () => void;
  maxOpen?: boolean;
  resetNote?: string | null;
};

export function PerkCard({ perk, optional, claimed, onToggleClaimed, onMaxCheckup, maxOpen, resetNote }: Props) {
  const tag = optional ? null : effortTag(perk);
  // Show "/ year" etc. only next to a plain rupee cap, as in the mock.
  const freq = perk.capInr !== null && /^₹[\d,]+$/.test(perk.capLabel) ? FREQ[perk.frequency] : "";
  const isCheckup = !!onMaxCheckup && !!perk.capInr;

  return (
    <Card className={cn("relative flex flex-col transition-colors", claimed && "border-good-line bg-good-soft/40")}>
      <Badge variant="outline" className="absolute top-4 right-4">
        p.{perk.sourcePage}
      </Badge>
      <div className="text-[28px] leading-none" aria-hidden>
        {perk.emoji}
      </div>
      {optional && (
        <Badge variant="warn" className="mt-2.5">
          Optional — check your schedule
        </Badge>
      )}
      <h3 className="mt-3 mb-1 pr-10 text-[15px] font-bold">{perk.name}</h3>
      <div className="text-[22px] font-extrabold">
        {perk.capLabel} {freq && <small className="text-xs font-medium text-muted-foreground">{freq}</small>}
      </div>
      <p className="mt-1.5 mb-2.5 text-[13px] text-muted-foreground">{perk.oneLiner}</p>
      {isCheckup && (
        <p className="mb-2.5 rounded-lg bg-good-soft px-2.5 py-2 text-[13px] text-good-ink">
          A basic full-body check-up costs about {inr(BASE_PACKAGE.priceInr)}. You have {inr(perk.capInr!)} — use all of it.
        </p>
      )}
      {isCheckup && resetNote && <p className="mb-2.5 text-[12px] font-semibold text-warn">⏰ {resetNote}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {tag && <Badge variant={tag === "Easy" ? "good" : "default"}>{tag}</Badge>}
        {onToggleClaimed && !optional && (
          <button
            type="button"
            onClick={onToggleClaimed}
            aria-pressed={!!claimed}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold transition-colors",
              claimed ? "border-good bg-good text-white" : "text-muted-foreground hover:bg-secondary",
            )}
          >
            {claimed ? (
              <>
                Claimed <Check className="size-3" strokeWidth={3} />
              </>
            ) : (
              "Mark claimed"
            )}
          </button>
        )}
        {isCheckup && (
          <Button size="sm" variant="brand" className="ml-auto" onClick={onMaxCheckup} aria-expanded={maxOpen}>
            Max my {inr(perk.capInr!)} →
          </Button>
        )}
      </div>
    </Card>
  );
}
