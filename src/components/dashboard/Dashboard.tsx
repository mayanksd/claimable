import type { Extraction } from "@/lib/schema";
import { withSourcesOnly } from "@/lib/extraction";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PrivacyBanner } from "./PrivacyBanner";
import { HeroValue } from "./HeroValue";
import { PerkGrid } from "./PerkGrid";
import { MoneyBack } from "./MoneyBack";
import { WatchOut } from "./WatchOut";

type Props = {
  extraction: Extraction;
  redactedText: string;
  redactions: { count: number };
  firstName?: string | null;
  demo: boolean;
  cachedAnswers: Record<string, string>;
};

export function Dashboard({ extraction, redactedText, redactions, firstName, demo, cachedAnswers }: Props) {
  const e = withSourcesOnly(extraction);
  return (
    <div className="mx-auto grid max-w-[1360px] gap-6 px-4 py-6 sm:px-7 lg:grid-cols-[1fr_400px]">
      <main className="min-w-0">
        <h1 className="mb-3 text-2xl font-extrabold tracking-tight sm:text-[28px]">Hi{firstName ? ` ${firstName}` : ""} 👋</h1>
        <PrivacyBanner count={redactions.count} />
        <HeroValue policy={e.policy} heroValue={e.heroValue} />
        <PerkGrid perks={e.perks} />
        <MoneyBack moneyBack={e.moneyBack} rewards={e.rewards} />
        <WatchOut flags={e.redFlags} />
      </main>
      <aside className="min-w-0">
        <ChatPanel extraction={e} redactedText={redactedText} demo={demo} cached={cachedAnswers} />
      </aside>
    </div>
  );
}
