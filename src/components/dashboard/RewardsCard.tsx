import { Card } from "@/components/ui/card";
import type { Extraction } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./SectionTitle";

const n = (x: number) => x.toLocaleString("en-IN");
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function RewardsCard({ rewards }: { rewards: NonNullable<Extraction["rewards"]> }) {
  const { coinBalance, items, redeemableNow, nextItem, programmeNote } = rewards;
  const next = nextItem ? items.find((i) => i.name === nextItem.name) : undefined;
  const ringPct = next ? Math.min(100, (coinBalance / next.coins) * 100) : 100;
  const sorted = [...items].sort((a, b) => a.coins - b.coins);

  const headline = [
    redeemableNow.length ? `Redeem a ${lower(redeemableNow[0])} today.` : "Nothing to redeem yet.",
    nextItem ? `You're ${n(nextItem.gap)} coins from a ${lower(nextItem.name)}.` : "",
  ].join(" ");

  return (
    <section>
      <SectionTitle title="Your step rewards" hint="from your app screenshot" />
      <Card className="grid items-center gap-[18px] sm:grid-cols-[auto_1fr]">
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
          {programmeNote && <div className="mt-2.5 text-[13px] text-muted-foreground">{programmeNote}</div>}
        </div>
      </Card>
    </section>
  );
}
