"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { RevealCard } from "@/components/RevealCard";
import { computeHeroValue } from "@/lib/perks";
import { withSourcesOnly } from "@/lib/extraction";
import { Nav } from "@/components/Nav";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { UploadPanel } from "@/components/upload/UploadPanel";
import type { AnalysisResult, AnalyzeEvent } from "@/lib/analysis";
import { ExtractionSchema } from "@/lib/schema";
import { cachedAnswers } from "@/lib/demo";

const KEY = "claimable:last-result";

function loadSaved(): AnalysisResult | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as AnalysisResult;
    // Saved while part B was still loading (page closed or reloaded): that part never arrived.
    const unfinished = r.pending ? { pending: false, partBFailed: true } : {};
    return { ...r, ...unfinished, extraction: ExtractionSchema.parse(r.extraction) };
  } catch {
    return null;
  }
}

export function App() {
  const [ready, setReady] = useState(false);
  const [demo, setDemo] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  // Confetti only for a result that was just produced, not one restored after a reload.
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    setDemo(new URLSearchParams(window.location.search).get("demo") === "1");
    setResult(loadSaved());
    setReady(true);
  }, []);

  function show(r: AnalysisResult) {
    setUploadError(null);
    setRevealDone(false);
    setResult(r);
    setFresh(true);
    window.scrollTo(0, 0);
    try {
      localStorage.setItem(KEY, JSON.stringify(r));
    } catch {
      /* storage full or blocked: the result still shows */
    }
  }

  const [uploadError, setUploadError] = useState<string | null>(null);

  /** Part B landed after the dashboard opened: merge it (or go back if it isn't a health policy). */
  function applyUpdate(u: Extract<AnalyzeEvent, { type: "update" }>) {
    if (u.notHealth) {
      setResult(null);
      setFresh(false);
      setUploadError(u.notHealth);
      try {
        localStorage.removeItem(KEY);
      } catch {}
      return;
    }
    setResult((r) => {
      if (!r) return r;
      const next: AnalysisResult = u.extraction
        ? { ...r, extraction: u.extraction, pending: false }
        : { ...r, pending: false, partBFailed: true };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function startOver() {
    setUploadError(null);
    setResult(null);
    setFresh(false);
    window.scrollTo(0, 0);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }

  const reduceMotion = useReducedMotion();
  // A freshly produced result gets the ~1.5 s reveal card first (not with reduced motion, not for saved results).
  const [revealDone, setRevealDone] = useState(false);
  const finishReveal = useCallback(() => setRevealDone(true), []);
  const revealing = !!result && fresh && !revealDone && !reduceMotion;
  const view = !ready ? "loading" : result ? (revealing ? "reveal" : "dashboard") : "upload";

  return (
    <MotionConfig reducedMotion="user">
      <Nav sample={!!result?.sample} onStartOver={result ? startOver : undefined} />
      <AnimatePresence mode="wait" initial={false}>
        {view !== "loading" && (
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: view === "reveal" ? 0.3 : 0.35, ease: "easeOut" }}
          >
            {result && view === "reveal" ? (
              <RevealCard
                total={computeHeroValue(withSourcesOnly(result.extraction)).annualPerksValueInr}
                onDone={finishReveal}
              />
            ) : result ? (
              <Dashboard
                extraction={result.extraction}
                redactedText={result.redactedText}
                redactions={result.redactions}
                firstName={result.firstName}
                pending={!!result.pending}
                partBFailed={!!result.partBFailed}
                demo={demo}
                cachedAnswers={cachedAnswers}
                revealed={fresh}
              />
            ) : (
              <UploadPanel demo={demo} onDone={show} onUpdate={applyUpdate} initialError={uploadError} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
