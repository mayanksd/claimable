import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Extraction } from "@/lib/schema";

type Perk = Extraction["perks"][number];

const FREQ: Record<Perk["frequency"], string> = {
  per_year: "/ year",
  per_policy_term: "/ policy term",
  per_event: "/ event",
  one_time: "once",
  unlimited: "",
};

const MODE: Record<Perk["claimMode"], { label: string; variant: "default" | "good" } | null> = {
  reimbursement: { label: "Reimbursement", variant: "default" },
  cashless: { label: "Cashless", variant: "good" },
  free: { label: "Free", variant: "good" },
  in_app: { label: "In app", variant: "good" },
  unknown: null,
};

export function PerkCard({ perk }: { perk: Perk }) {
  const mode = MODE[perk.claimMode];
  // Show "/ year" etc. only next to a plain rupee cap, as in the mock.
  const freq = perk.capInr !== null && /^₹[\d,]+$/.test(perk.capLabel) ? FREQ[perk.frequency] : "";
  return (
    <Card className="relative">
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
      {mode && <Badge variant={mode.variant}>{mode.label}</Badge>}
    </Card>
  );
}
