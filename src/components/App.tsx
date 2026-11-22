"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { RevealCard } from "@/components/RevealCard";
import { stopConfetti } from "@/lib/client/confetti";
import { computeHeroValue, heroMode } from "@/lib/perks";
import { withSourcesOnly } from "@/lib/extraction";
import { Nav } from "@/components/Nav";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { UploadPanel } from "@/components/upload/UploadPanel";
import type { AnalysisResult, AnalyzeEvent } from "@/lib/analysis";
import { ExtractionSchema } from "@/lib/schema";
import { cachedAnswers } from "@/lib/demo";
import { DEFAULT_SAMPLE, SAMPLES, type SampleId } from "@/lib/samples";
import { isCheckupPerk } from "@/lib/perks";
import type { About } from "@/lib/agent/types";
import { AgentHome } from "@/components/agent/AgentHome";
import { AboutYou, BackLink } from "@/components/agent/AboutYou";
import { AgentRun } from "@/components/agent/AgentRun";

type Screen = "home" | "upload" | "about" | "agent" | "dashboard";

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
  const [screen, setScreenRaw] = useState<Screen>("home");
  const [focusChat, setFocusChat] = useState(false);
  const [about, setAbout] = useState<{ about: About; fromPolicy: boolean; run: number } | null>(null);
  const go = (s: Screen, opts: { chat?: boolean } = {}) => {
    setFocusChat(!!opts.chat);
    setScreenRaw(s);
    window.scrollTo(0, 0);
  };
  // No upload yet: the chosen sample policy (Arjun by default) powers home, agent, dashboard and chat.
  const [sampleId, setSampleId] = useState<SampleId>(DEFAULT_SAMPLE);
  const current = result ?? SAMPLES[sampleId].result;
  // Cached demo answers: per persona sample; the original Aarogya sample (upload screen) keeps its own.
  const answers = result ? cachedAnswers : SAMPLES[sampleId].cachedAnswers;

  /** "Try it as:" on home: switch to that sample (drops an uploaded policy). */
  function pickSample(id: SampleId) {
    setSampleId(id);
    setResult(null);
    setFresh(false);
    setAbout(null);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }
  // Confetti only for a result that was just produced, not one restored after a reload.
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    setDemo(new URLSearchParams(window.location.search).get("demo") === "1");
    setResult(loadSaved());
    setReady(true);
  }, []);

  function show(r: AnalysisResult) {
    setCarriedFile(null);
    setUploadError(null);
    setRevealDone(false);
    setResult(r);
    setFresh(true);
    setAbout(null);
    go("dashboard");
    try {
      localStorage.setItem(KEY, JSON.stringify(r));
    } catch {
      /* storage full or blocked: the result still shows */
    }
  }

  const [uploadError, setUploadError] = useState<string | null>(null);
  // Bumped whenever we return to the upload screen, so a fresh UploadPanel mounts
  // (framer-motion would otherwise revive the still-exiting one with its old "analyzing" state).
  const [attempt, setAttempt] = useState(0);

  /** Part B landed after the dashboard opened: merge it (or go back if it isn't a health policy). */
  function applyUpdate(u: Extract<AnalyzeEvent, { type: "update" }>) {
    if (u.notHealth) {
      void stopConfetti();
      setAttempt((n) => n + 1);
      setResult(null);
      setFresh(false);
      setUploadError(u.notHealth);
      setScreenRaw("upload");
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

  // "Upload my policy →" on the wording-only card: back to upload with that PDF already chosen.
  const [carriedFile, setCarriedFile] = useState<File | null>(null);
  function uploadAnother(file: File) {
    setCarriedFile(file);
    startOver("upload");
  }

  /** Drops the uploaded policy: back to the sample on the home screen (or straight to upload). */
  function startOver(to: Screen = "home") {
    setAttempt((n) => n + 1);
    setUploadError(null);
    setResult(null);
    setFresh(false);
    setAbout(null);
    go(to);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }

  const reduceMotion = useReducedMotion();
  // A freshly produced result gets the ~1.5 s reveal card first (not with reduced motion, not for saved results).
  const [revealDone, setRevealDone] = useState(false);
  const finishReveal = useCallback(() => setRevealDone(true), []);
  // Nothing to celebrate (₹0, e.g. not really a health policy) → no reveal, no confetti.
  // Wording-only uploads and ₹0 totals get no reveal and no confetti (heroMode "wording" / "count").
  const revealTotal = computeHeroValue(withSourcesOnly(current.extraction)).annualPerksValueInr;
  const revealing =
    screen === "dashboard" && fresh && !revealDone && !reduceMotion && heroMode(withSourcesOnly(current.extraction)) === "value";
  const view = !ready ? "loading" : revealing ? "reveal" : screen;
  const checkup = withSourcesOnly(current.extraction).perks.find(isCheckupPerk) ?? null;
  const startAgent = () => go("about");

  return (
    <MotionConfig reducedMotion="user">
      <Nav
        sample={!!current.sample}
        onHome={view === "home" ? undefined : () => go("home")}
        onStartOver={result && !result.sample ? () => startOver() : undefined}
      />
      <AnimatePresence mode="wait" initial={false}>
        {view !== "loading" && (
          <motion.div
            key={view === "upload" ? `upload-${attempt}` : view === "agent" ? `agent-${about?.run ?? 0}` : view}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: view === "reveal" ? 0.3 : 0.35, ease: "easeOut" }}
          >
            {view === "reveal" ? (
              <RevealCard total={revealTotal} onDone={finishReveal} />
            ) : view === "home" ? (
              <AgentHome
                limitInr={checkup?.capInr ?? null}
                reimbursement={checkup?.claimMode !== "cashless"}
                samples={Object.values(SAMPLES).map((x) => ({ id: x.id, emoji: x.emoji, label: x.label }))}
                selected={result ? null : sampleId}
                ownLabel={result ? (result.sample ? "📄 Aarogya sample" : "📄 Your policy") : null}
                onPick={pickSample}
                onMax={startAgent}
                onDashboard={() => go("dashboard")}
                onChat={() => go("dashboard", { chat: true })}
                onOwnPolicy={() => startOver("upload")}
              />
            ) : view === "about" ? (
              <AboutYou
                profile={current.profile}
                initial={about?.about}
                onBack={() => go("home")}
                onRun={(a, fromPolicy) => {
                  setAbout((x) => ({ about: a, fromPolicy, run: (x?.run ?? 0) + 1 }));
                  go("agent");
                }}
              />
            ) : view === "agent" && about ? (
              <AgentRun
                key={about.run}
                extraction={withSourcesOnly(current.extraction)}
                policyText={current.redactedText}
                about={about.about}
                fromPolicy={about.fromPolicy}
                demo={demo}
                onBack={() => go("about")}
                onExplore={() => go("dashboard")}
              />
            ) : view === "dashboard" || view === "agent" ? (
              <Dashboard
                extraction={current.extraction}
                redactedText={current.redactedText}
                redactions={current.redactions}
                firstName={current.firstName}
                pending={!!current.pending}
                partBFailed={!!current.partBFailed}
                onUploadPolicy={uploadAnother}
                demo={demo}
                cachedAnswers={answers}
                revealed={fresh}
                onMaxCheckup={startAgent}
                focusChat={focusChat}
              />
            ) : (
              <>
                <div className="mx-auto w-full max-w-[640px] px-4 pt-4">
                  <BackLink onClick={() => go("home")} />
                </div>
                <UploadPanel demo={demo} onDone={show} onUpdate={applyUpdate} initialError={uploadError} initialFile={carriedFile} />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
