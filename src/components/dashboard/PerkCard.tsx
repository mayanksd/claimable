import { Check, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Extraction } from "@/lib/schema";
import { effortTag, perkAmount, perkDescription } from "@/lib/perks";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { askChat, claimQuestion } from "@/lib/client/askChat";
import { BASE_PACKAGE } from "@/data/test-prices";

type Perk = Extraction["perks"][number];


type Props = {
  perk: Perk;
  /** Optional cover: only applies if bought, so label it and skip the actions. */
  optional?: boolean;
  claimed?: boolean;
  onToggleClaimed?: () => void;
  /** Health check-up only: its primary action is the planner. */
  onMaxCheckup?: () => void;
  maxOpen?: boolean;
  resetNote?: string | null;
  /** Lets "up to sum insured" limits show as words, not a giant number. */
  sumInsuredInr?: number;
};

export function PerkCard({ perk, optional, claimed, onToggleClaimed, onMaxCheckup, maxOpen, resetNote, sumInsuredInr = 0 }: Props) {
  const tag = optional ? null : effortTag(perk);
  const { prefix, amount, freq } = perkAmount(perk, sumInsuredInr);
  const isCheckup = !!onMaxCheckup && !!perk.capInr;

  return (
    <Card
      className={cn(
        "relative flex h-full w-full flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none",
        claimed && "border-good-line bg-good-soft/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="grid size-14 place-items-center rounded-full bg-warm-soft text-[44px] leading-none sm:size-16 sm:text-[56px]" aria-hidden>
          {perk.emoji}
        </div>
        <span className="pt-1 text-xs text-muted-foreground">Pg {perk.sourcePage}</span>
      </div>
      {optional && (
        <Badge variant="warn" className="mt-2.5">
          Optional — check your schedule
        </Badge>
      )}
      <h3 className="mt-3 mb-1 text-base font-bold text-balance">{perk.name}</h3>
      {prefix && <div className="text-xs font-semibold text-muted-foreground">{prefix}</div>}
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-display leading-tight font-extrabold tabular-nums",
            // Big for numbers and short labels ("Unlimited", "Up to 20%"); wordy limits stay readable.
            amount.startsWith("₹") || amount.length <= 12 ? "text-[28px]" : "text-xl",
          )}
        >
          {amount}
        </span>
        {freq && <span className="text-sm font-medium text-muted-foreground">{freq}</span>}
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{perkDescription(perk)}</p>
      {isCheckup && (
        <p className="mt-2.5 rounded-lg bg-good-soft px-2.5 py-2 text-sm text-good-ink">
          A basic full-body check-up costs about {inr(BASE_PACKAGE.priceInr)}. You have {inr(perk.capInr!)} — use all of it.
        </p>
      )}
      {isCheckup && resetNote && <p className="mt-2 text-xs font-semibold text-warn">⏰ {resetNote}</p>}

      {!optional && (
        // Footer pinned to the bottom so every card's actions line up.
        <div className="mt-auto grid gap-2.5 pt-4">
          {isCheckup ? (
            <Button variant="hero" className="w-full" onClick={onMaxCheckup} aria-expanded={maxOpen}>
              Max my {inr(perk.capInr!)} →
            </Button>
          ) : (
            <Button variant="brand" className="w-full" onClick={() => askChat(claimQuestion(perk.name))}>
              <MessageCircle className="size-4" /> How do I claim this? →
            </Button>
          )}
          <div className="flex min-h-7 items-center justify-between gap-2">
            {tag ? <Badge variant={tag === "Easy" ? "good" : "default"}>{tag}</Badge> : <span />}
            {onToggleClaimed && (
              <button
                type="button"
                onClick={onToggleClaimed}
                aria-pressed={!!claimed}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition-colors max-sm:min-h-11 max-sm:px-3",
                  claimed ? "bg-good text-white" : "text-muted-foreground underline-offset-2 hover:bg-secondary hover:underline",
                )}
              >
                {claimed ? (
                  <>
                    Used <Check className="size-3" strokeWidth={3} />
                  </>
                ) : (
                  "Mark as used"
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
