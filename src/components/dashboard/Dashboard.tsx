import type { Extraction } from "@/lib/schema";
import { withSourcesOnly } from "@/lib/extraction";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PrivacyBanner } from "./PrivacyBanner";
import { HeroValue } from "./HeroValue";
import { PerkGrid } from "./PerkGrid";
import { RewardsCard } from "./RewardsCard";
import { RedFlags } from "./RedFlags";

type Props = {
  extraction: Extraction;
  redactedText: string;
  redactions: { count: number };
  demo: boolean;
  cachedAnswers: Record<string, string>;
};

export function Dashboard({ extraction, redactedText, redactions, demo, cachedAnswers }: Props) {
  const e = withSourcesOnly(extraction);
  return (
    <div className="mx-auto grid max-w-[1360px] gap-6 px-4 py-6 sm:px-7 lg:grid-cols-[1fr_400px]">
      <main className="min-w-0">
        <PrivacyBanner count={redactions.count} />
        <HeroValue policy={e.policy} heroValue={e.heroValue} />
        <PerkGrid perks={e.perks} only={["use_now"]} />
        {e.rewards && <RewardsCard rewards={e.rewards} />}
        <RedFlags flags={e.redFlags} />
        <PerkGrid perks={e.perks} only={["good_to_know", "emergency"]} />
      </main>
      <aside className="min-w-0">
        <ChatPanel extraction={e} redactedText={redactedText} demo={demo} cached={cachedAnswers} />
      </aside>
    </div>
  );
}
