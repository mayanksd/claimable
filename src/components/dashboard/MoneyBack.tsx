import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Extraction } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./SectionTitle";

const n = (x: number) => x.toLocaleString("en-IN");
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

type Props = Pick<Extraction, "moneyBack" | "rewards">;

/** Ways to earn money back (renewal discounts, reward coins), plus the coin balance if a screenshot was given. */
export function MoneyBack({ moneyBack, rewards }: Props) {
  if (!moneyBack.length && !rewards) return null;
  return (
    <section>
      <SectionTitle title="Money back" hint={rewards ? "from your policy and app screenshot" : "from your policy"} />
      <Card className="grid gap-4">
        {moneyBack.map((m) => (
          <div key={m.title} className="flex items-start gap-3">
            <span className="text-2xl leading-none" aria-hidden>
              {m.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <b className="block">{m.title}</b>
              <span className="text-[13px] text-muted-foreground">{m.detail}</span>
            </div>
            <Badge variant="outline">p.{m.sourcePage}</Badge>
          </div>
        ))}
        {rewards && <Coins rewards={rewards} divider={moneyBack.length > 0} note={!moneyBack.length} />}
      </Card>
    </section>
  );
}

function Coins({ rewards, divider, note }: { rewards: NonNullable<Extraction["rewards"]>; divider: boolean; note: boolean }) {
  const { coinBalance, items, redeemableNow, nextItem, programmeNote } = rewards;
  const next = nextItem ? items.find((i) => i.name === nextItem.name) : undefined;
  const ringPct = next ? Math.min(100, (coinBalance / next.coins) * 100) : 100;
  const sorted = [...items].sort((a, b) => a.coins - b.coins);
  const headline = [
    redeemableNow.length ? `Redeem a ${lower(redeemableNow[0])} today.` : "Nothing to redeem yet.",
    nextItem ? `You're ${n(nextItem.gap)} coins from a ${lower(nextItem.name)}.` : "",
  ].join(" ");

  return (
    <div className={cn("grid items-center gap-[18px] sm:grid-cols-[auto_1fr]", divider && "border-t pt-4")}>
      <div
        className="grid size-[110px] place-items-center rounded-full"
        style={{ background: `conic-gradient(var(--good) 0 ${ringPct}%, #e5e7eb 0)` }}
      >
        <div className="grid size-[86px] place-items-center rounded-full bg-white text-center text-xl font-extrabold">
          <div>
            {n(coinBalance)}
            <small className="block text-[11px] font-semibold text-muted-foreground">coins</small>
          </div>
        </div>
      </div>
      <div>
        <div className="mb-2.5 font-bold">{headline}</div>
        <div className="flex flex-wrap gap-2.5">
          {sorted.map((item) => {
            const now = item.available && redeemableNow.includes(item.name);
            const isNext = nextItem?.name === item.name;
            return (
              <div
                key={item.name}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-[13px]",
                  now && "border-good-line bg-good-soft",
                  isNext && "border-warn-line bg-warn-soft",
                  !item.available && "opacity-50",
                )}
              >
                <b className="block">
                  {item.emoji} {item.name}
                </b>
                {n(item.coins)}
                {now && " · redeem now"}
                {isNext && nextItem && ` · ${n(nextItem.gap)} to go`}
                {!item.available && " · out of stock"}
              </div>
            );
          })}
        </div>
        {note && programmeNote && <div className="mt-2.5 text-[13px] text-muted-foreground">{programmeNote}</div>}
      </div>
    </div>
  );
}
