import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Extraction } from "@/lib/schema";
import { effortTag } from "@/lib/perks";
import { inr } from "@/lib/format";
import { BASE_PACKAGE } from "@/data/test-prices";
import { Button } from "@/components/ui/button";

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
  /** Health check-up only: opens the "Max your check-up" planner. */
  onMaxCheckup?: () => void;
  maxOpen?: boolean;
};

export function PerkCard({ perk, onMaxCheckup, maxOpen }: Props) {
  const tag = effortTag(perk);
  // Show "/ year" etc. only next to a plain rupee cap, as in the mock.
  const freq = perk.capInr !== null && /^₹[\d,]+$/.test(perk.capLabel) ? FREQ[perk.frequency] : "";
  return (
    <Card className="relative flex flex-col">
      <Badge variant="outline" className="absolute top-4 right-4">
        p.{perk.sourcePage}
      </Badge>
      <div className="text-[28px] leading-none" aria-hidden>
        {perk.emoji}
      </div>
      <h3 className="mt-3 mb-1 pr-10 text-[15px] font-bold">{perk.name}</h3>
      <div className="text-[22px] font-extrabold">
        {perk.capLabel} {freq && <small className="text-xs font-medium text-muted-foreground">{freq}</small>}
      </div>
      <p className="mt-1.5 mb-2.5 text-[13px] text-muted-foreground">{perk.oneLiner}</p>
      {onMaxCheckup && perk.capInr && (
        <p className="mb-2.5 rounded-lg bg-good-soft px-2.5 py-2 text-[13px] text-good-ink">
          A basic full-body check-up costs about {inr(BASE_PACKAGE.priceInr)}. You have {inr(perk.capInr)} — use all of it.
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        {tag && <Badge variant={tag === "Easy" ? "good" : "default"}>{tag}</Badge>}
        {onMaxCheckup && perk.capInr && (
          <Button size="sm" variant="brand" onClick={onMaxCheckup} aria-expanded={maxOpen}>
            Max my {inr(perk.capInr)} →
          </Button>
        )}
      </div>
    </Card>
  );
}
