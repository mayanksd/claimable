"use client";

import { useMemo, useState } from "react";
import type { Extraction } from "@/lib/schema";
import { withSourcesOnly } from "@/lib/extraction";
import { withComputedHero } from "@/lib/perks";
import { claimedKey, claimedTotal } from "@/lib/claimed";
import { formatDay, nextPolicyYearStart } from "@/lib/policyDates";
import { useClaimed } from "@/lib/client/useClaimed";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ChatFab } from "@/components/chat/ChatFab";
import { Badge } from "@/components/ui/badge";
import { HeroValue } from "./HeroValue";
import { PerkGrid } from "./PerkGrid";
import { MoneyBack } from "./MoneyBack";
import { OptionalCovers } from "./OptionalCovers";
import { ClaimedProgress } from "./ClaimedProgress";
import { TopicTab } from "./TopicTab";
import { WatchOut, watchOutFlags } from "./WatchOut";
import { Tabs } from "./Tabs";
import { TabLoading, TabUnavailable } from "./TabLoading";
import { Loader2 } from "lucide-react";

type Props = {
  extraction: Extraction;
  redactedText: string;
  redactions: { count: number };
  firstName?: string | null;
  demo: boolean;
  cachedAnswers: Record<string, string>;
  /** The reveal card already counted the ₹ up; show the hero total straight away. */
  revealed?: boolean;
  /** Family / lifestyle / watch-out data still loading (part B). */
  pending?: boolean;
  partBFailed?: boolean;
};

const EMPLOYER_TIP = "Tip: check your employer's group policy — they often cover maternity from day one.";

export function Dashboard({ extraction, redactedText, firstName, demo, cachedAnswers, revealed, pending, partBFailed }: Props) {
  // Hero total is recomputed in code (also for saved results from older builds).
  const e = useMemo(() => withComputedHero(withSourcesOnly(extraction)), [extraction]);
  const [tab, setTab] = useState("perks");
  const { claimed, toggle } = useClaimed(claimedKey(e));


  const flags = watchOutFlags(e);

  const reset = e.checkupFrequency?.everyYear ? nextPolicyYearStart(e.policy.startDate, new Date()) : null;
  const resetNote = reset ? `Your check-up resets on ${formatDay(reset)} — book before then.` : null;
  const maternityExcluded = e.family.items.some((i) => /maternity|deliver/i.test(i.title) && i.status === "not_covered");


  return (
    <div className="mx-auto grid max-w-[1360px] gap-6 px-4 pt-10 pb-8 max-lg:pb-24 sm:px-7 lg:grid-cols-[1fr_400px]">
      <main className="min-w-0">
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[28px] leading-tight font-extrabold tracking-tight sm:text-[34px]">
              {firstName ? `Nice, ${firstName}! 🎉` : "You're in! 🎉"}
            </h1>
            {e.documentType === "group_health" && <Badge variant="default">Employer policy</Badge>}
          </div>
          <p className="text-base font-medium text-muted-foreground">Here&apos;s what your policy owes you.</p>
        </div>
        {!e.isScheduleIncluded && (
          <div className="mb-4 rounded-xl border border-warn-line bg-warn-soft px-3.5 py-2.5 text-sm font-medium text-foreground">
            📄 We only found the general policy wording. Upload the full PDF with your schedule to see your exact perks.
          </div>
        )}
        <HeroValue policy={e.policy} heroValue={e.heroValue} instant={revealed} />

        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            {
              id: "perks",
              label: "Perks 🎁",
              shortLabel: "Perks 🎁",
              star: true,
              badge: (
                <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold">
                  {e.perks.length}
                  <span className="hidden sm:inline"> perks</span>
                </span>
              ),
            },
            { id: "family", label: "Planning a family? 👶", shortLabel: "Family 👶" },
            { id: "lifestyle", label: "Health glow-up ✨", shortLabel: "Glow-up ✨" },
            {
              id: "watch",
              label: "Watch out ⚠️",
              shortLabel: "Watch out ⚠️",
              badge: pending ? (
                <Loader2 className="size-4 animate-spin" aria-label="loading" />
              ) : flags.length ? (
                // Amber on the tab; red is kept for the serious items inside it.
                <span className="rounded-full border border-warn-line bg-warn-soft px-1.5 text-xs font-bold text-warn">
                  {flags.length}
                  <span className="hidden sm:inline"> to know</span>
                </span>
              ) : undefined,
            },
          ]}
        />

        <div role="tabpanel" id={`panel-${tab}`} aria-label={tab}>
          {tab === "perks" && (
            <>
              <PerkGrid
                perks={e.perks}
                policyText={redactedText}
                claimed={claimed}
                onToggleClaimed={toggle}
                checkupResetNote={resetNote}
              />
              <ClaimedProgress claimed={claimedTotal(e, claimed)} total={e.heroValue.annualPerksValueInr} />
              <OptionalCovers covers={e.optionalCovers} />
              <MoneyBack moneyBack={e.moneyBack} rewards={e.rewards} />
            </>
          )}
          {tab !== "perks" && pending && <TabLoading label="Still reading the fine print for this tab…" />}
          {tab !== "perks" && !pending && partBFailed && <TabUnavailable />}
          {tab === "family" && !pending && !partBFailed && (
            <TopicTab
              section={e.family}
              emptyText="Your policy doesn't mention maternity, newborn or fertility cover — ask your insurer."
              intro={
                maternityExcluded ? (
                  <div className="rounded-xl border border-bad/20 bg-bad-soft px-4 py-3 text-sm">
                    <b className="block text-bad">This policy doesn&apos;t cover maternity.</b>
                    <span className="text-foreground">{EMPLOYER_TIP}</span>
                  </div>
                ) : undefined
              }
            />
          )}
          {tab === "lifestyle" && !pending && !partBFailed && (
            <TopicTab
              section={e.lifestyle}
              emptyText="Your policy doesn't mention any health glow-up cover (chronic care, weight or wellness) — ask your insurer."
              intro={<p className="text-sm text-muted-foreground">Staying on top of everyday health? Here&apos;s what helps. 💪</p>}
            />
          )}
          {tab === "watch" && !pending && !partBFailed && <WatchOut flags={flags} />}
        </div>
      </main>
      <aside className="min-w-0">
        <ChatPanel extraction={e} redactedText={redactedText} demo={demo} cached={cachedAnswers} />
      </aside>
      <ChatFab />
    </div>
  );
}
