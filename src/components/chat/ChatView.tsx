"use client";

import { useMemo } from "react";
import type { Extraction } from "@/lib/schema";
import { withSourcesOnly } from "@/lib/extraction";
import { withComputedHero } from "@/lib/perks";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "./ChatPanel";

type Props = {
  extraction: Extraction;
  redactedText: string;
  demo: boolean;
  cachedAnswers: Record<string, string>;
  /** Null when the policy has no check-up limit to plan with. */
  checkupLimitInr: number | null;
  onMaxCheckup: () => void;
  onDashboard: () => void;
};

/** "Talk to my policy": the chat on its own screen, with the two other ways in at the top. */
export function ChatView({ extraction, redactedText, demo, cachedAnswers, checkupLimitInr, onMaxCheckup, onDashboard }: Props) {
  const e = useMemo(() => withComputedHero(withSourcesOnly(extraction)), [extraction]);
  return (
    <div className="mx-auto w-full max-w-[820px] px-4 pt-5 pb-6 sm:pt-7">
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:flex sm:justify-center">
        <Button
          variant="hero"
          className="h-auto min-h-12 rounded-2xl px-4 text-base whitespace-normal sm:px-6"
          onClick={onMaxCheckup}
          disabled={!checkupLimitInr}
          title={checkupLimitInr ? undefined : "This policy has no check-up limit to plan with"}
        >
          🧬 Max my check-up
        </Button>
        <Button variant="outline" className="h-auto min-h-12 rounded-2xl px-4 text-base whitespace-normal sm:px-6" onClick={onDashboard}>
          📊 Full dashboard
        </Button>
      </div>
      <ChatPanel extraction={e} redactedText={redactedText} demo={demo} cached={cachedAnswers} focusOnMount fullScreen />
    </div>
  );
}
